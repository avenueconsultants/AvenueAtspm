
using DatabaseInstaller.Commands;
using Google.Cloud.BigQuery.V2;
using Google.Apis.Bigquery.v2.Data; // for TableReference

using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Polly.Retry;
using System.IO.Compression;
using Utah.Udot.Atspm.Data.Models.EventLogModels;
using Utah.Udot.Atspm.Data.Models;
using Utah.Udot.Atspm.Repositories.ConfigurationRepositories;
using Google.Cloud.Storage.V1;
using Polly;
using Google.Apis.Bigquery.v2.Data;


namespace DatabaseInstaller.Services
{
    public class TransferIndianaEventsToBigQueryService : IHostedService
    {
        private readonly BigQueryClient _client;
        private readonly StorageClient _storageClient;
        private readonly string _gapTable = "IndianaEventLogGaps";
        private readonly string _table = "IndianaEventLogs";
        private readonly string _bucket = "salt-lake-mobility-event-uploads";

        private readonly ILogger<TransferIndianaEventsToBigQueryService> _logger;
        private readonly ILocationRepository _locationRepository;
        private readonly TransferCommandConfiguration _config;

        private readonly AsyncRetryPolicy _retryPolicy = Polly.Policy
            .Handle<Exception>()
            .WaitAndRetryAsync(
        new[]
        {
            TimeSpan.FromSeconds(30),
            TimeSpan.FromSeconds(30),
            TimeSpan.FromSeconds(30),
            TimeSpan.FromMinutes(10),
            TimeSpan.FromMinutes(10),
            TimeSpan.FromHours(1),
            TimeSpan.FromHours(1),
            TimeSpan.FromHours(1),
            TimeSpan.FromHours(1),
            TimeSpan.FromHours(1),
            TimeSpan.FromHours(1),
        },
        onRetry: (exception, timeSpan, retryCount, context) =>
        {
            Console.WriteLine($"[Retry {retryCount}] Waiting {timeSpan.TotalMinutes:n1} min due to: {exception.Message}");
        });

        public TransferIndianaEventsToBigQueryService(
            ILogger<TransferIndianaEventsToBigQueryService> logger,
            ILocationRepository locationRepository,
            IOptions<TransferCommandConfiguration> config,
            BigQueryClient client,
            StorageClient storageClient)
        {
            _logger = logger;
            _locationRepository = locationRepository;
            _config = config.Value;
            _client = client;
            _storageClient = storageClient;
        }

        public async Task StartAsync(CancellationToken cancellationToken)
        {
            var locationIds = !string.IsNullOrEmpty(_config.Locations)
                ? _config.Locations.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(x => x.Trim()).ToList()
                : _locationRepository.GetList().Select(l => l.LocationIdentifier).Distinct().ToList();

            for (var currentDay = DateOnly.FromDateTime(_config.Start); currentDay <= DateOnly.FromDateTime(_config.End); currentDay = currentDay.AddDays(1))
            {
                foreach (var locationId in locationIds)
                {
                    try
                    {
                        var controllerEvents = await _retryPolicy.ExecuteAsync(() =>
                            GetDailyEvents(locationId, currentDay.ToDateTime(TimeOnly.MinValue)));

                        if (!controllerEvents.Any())
                        {
                            _logger.LogWarning("No events for {LocationId} on {Date}", locationId, currentDay);
                            await LogGapToBigQuery(locationId, currentDay);
                            continue;
                        }

                        _logger.LogInformation("Retrieved {Count} raw events for {LocationId} on {Date}", controllerEvents.Count, locationId, currentDay);

                        var indianaEvents = controllerEvents
                            .Where(e => e.EventParam < 32000)
                            .Select(e => new IndianaEvent
                            {
                                LocationIdentifier = e.SignalIdentifier,
                                Timestamp = e.Timestamp,
                                EventCode = (short)e.EventCode,
                                EventParam = (short)e.EventParam
                            })
                            .ToList();

                        var batchId = Guid.NewGuid().ToString("N");
                        var tempPath = Path.Combine(Path.GetTempPath(), $"indiana-events-{batchId}.ndjson");
                        await File.WriteAllLinesAsync(tempPath, indianaEvents.Select(JsonConvert.SerializeObject));

                        var gcsObject = $"indiana/{locationId}/{currentDay:yyyyMMdd}-{batchId}.ndjson";
                        await using var stream = File.OpenRead(tempPath);
                        await _storageClient.UploadObjectAsync(_bucket, gcsObject, "application/json", stream);

                        _logger.LogInformation("Uploaded NDJSON for {LocationId} on {Date} to GCS", locationId, currentDay);

                        var uri = $"gs://{_bucket}/{gcsObject}";
                        var destinationTable = new TableReference
                        {
                            ProjectId = _client.ProjectId,
                            DatasetId = "ATSPM",
                            TableId = _table
                        };

                        var loadOptions = new CreateLoadJobOptions
                        {
                            WriteDisposition = WriteDisposition.WriteAppend,
                            SourceFormat = FileFormat.NewlineDelimitedJson,
                            Autodetect = true
                        };

                        var job = _client.CreateLoadJob(uri, destinationTable, schema: null, options: loadOptions);
                        job = job.PollUntilCompleted();

                        if (job.Status.State == "DONE" && job.Status.ErrorResult == null)
                        {
                            _logger.LogInformation("BigQuery load succeeded");
                        }
                        else
                        {
                            _logger.LogError("BigQuery load failed: {Error}", job.Status.ErrorResult?.Message);
                        }

                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error processing {LocationId} on {Date}", locationId, currentDay);
                    }
                }
            }
        }

        private async Task LogGapToBigQuery(string locationId, DateOnly date)
        {
            var row = new BigQueryInsertRow
            {
                { "LocationIdentifier", locationId },
                { "MissingDate", date.ToString("yyyy-MM-dd") },
                { "LoggedAt", DateTime.UtcNow }
            };

            await _client.InsertRowAsync("ATSPM", _gapTable, row);
        }

        private async Task<List<ControllerEventLog>> GetDailyEvents(string locationId, DateTime date)
        {
            var events = new List<ControllerEventLog>();
            string query = @$"
                SELECT LogData FROM [dbo].[ControllerLogArchives]
                WHERE SignalId = @SignalId AND ArchiveDate = @Date";

            try
            {
                using var conn = new SqlConnection(_config.Source);
                await conn.OpenAsync();

                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@SignalId", locationId);
                cmd.Parameters.AddWithValue("@Date", date.Date);

                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    byte[] compressed = (byte[])reader["LogData"];
                    byte[] decompressed;

                    using var input = new MemoryStream(compressed);
                    using var gzip = new GZipStream(input, CompressionMode.Decompress);
                    using var output = new MemoryStream();
                    await gzip.CopyToAsync(output);

                    decompressed = output.ToArray();
                    string json = System.Text.Encoding.UTF8.GetString(decompressed);
                    events = JsonConvert.DeserializeObject<List<ControllerEventLog>>(json);
                    events.ForEach(e => e.SignalIdentifier = locationId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reading data for {LocationId} on {Date}", locationId, date);
            }

            return events ?? new();
        }

        public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
