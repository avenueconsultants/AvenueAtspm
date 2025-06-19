// Replaced TransferSpeedEventsToBigQueryService with GCS batch-loading logic.

using DatabaseInstaller.Commands;
using Google.Cloud.BigQuery.V2;
using Google.Apis.Bigquery.v2.Data;
using Google.Cloud.Storage.V1;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Polly;
using Polly.Retry;
using Utah.Udot.Atspm.Data.Models.EventLogModels;
using Utah.Udot.Atspm.Repositories.ConfigurationRepositories;
using Utah.Udot.Atspm.Repositories.EventLogRepositories;


namespace DatabaseInstaller.Services
{
    public class TransferSpeedEventsToBigQueryService : IHostedService
    {
        private readonly BigQueryClient _client;
        private readonly StorageClient _storageClient;
        private readonly string _table = "SpeedEvents";
        private readonly string _bucket = "salt-lake-mobility-event-uploads";

        private readonly ILogger<TransferSpeedEventsToBigQueryService> _logger;
        private readonly ISpeedEventLogBQRepository _eventRepo;
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

        public TransferSpeedEventsToBigQueryService(
            ILogger<TransferSpeedEventsToBigQueryService> logger,
            ISpeedEventLogBQRepository eventRepo,
            ILocationRepository locationRepository,
            IOptions<TransferCommandConfiguration> config,
            BigQueryClient client,
            StorageClient storageClient)
        {
            _logger = logger;
            _eventRepo = eventRepo;
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
                        var events = await _retryPolicy.ExecuteAsync(() =>
                            GetDailySpeedEvents(locationId, currentDay.ToDateTime(TimeOnly.MinValue), currentDay.ToDateTime(TimeOnly.MaxValue)));

                        if (!events.Any())
                        {
                            _logger.LogWarning("No speed events for {LocationId} on {Date}", locationId, currentDay);
                            continue;
                        }

                        _logger.LogInformation("Retrieved {Count} speed events for {LocationId} on {Date}", events.Count, locationId, currentDay);

                        var batchId = Guid.NewGuid().ToString("N");
                        var tempPath = Path.Combine(Path.GetTempPath(), $"speed-events-{batchId}.ndjson");
                        await File.WriteAllLinesAsync(tempPath, events.Select(JsonConvert.SerializeObject));

                        var gcsObject = $"speed/{locationId}/{currentDay:yyyyMMdd}-{batchId}.ndjson";
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

                        // ✅ Must pass `schema = null` if using autodetect
                        var job = _client.CreateLoadJob(uri, destinationTable, schema: null, options: loadOptions);
                        job = job.PollUntilCompleted();

                        if (job.Status.State == "DONE" && job.Status.ErrorResult == null)
                        {
                            _logger.LogInformation("Load succeeded");
                        }
                        else
                        {
                            _logger.LogError("Load failed: {Error}", job.Status.ErrorResult?.Message);
                        }

                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error processing speed events for {LocationId} on {Date}", locationId, currentDay);
                    }
                }
            }
        }

        private async Task<List<SpeedEvent>> GetDailySpeedEvents(string locationId, DateTime start, DateTime end)
        {
            var speedEvents = new List<SpeedEvent>();

            const string query = @"
                SELECT DISTINCT DetectorID, MPH, KPH, Timestamp
                FROM MOE.dbo.Speed_Events
                WHERE Timestamp >= @startUtc AND Timestamp < @endUtc
                  AND DetectorID LIKE @detectorPrefix";

            try
            {
                using var conn = new SqlConnection(_config.Source);
                await conn.OpenAsync();

                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@startUtc", start);
                cmd.Parameters.AddWithValue("@endUtc", end);
                cmd.Parameters.AddWithValue("@detectorPrefix", locationId + "%");
                cmd.CommandTimeout = 120;

                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    speedEvents.Add(new SpeedEvent
                    {
                        DetectorId = reader.GetString(reader.GetOrdinal("DetectorID")),
                        Mph = reader.GetInt32(reader.GetOrdinal("MPH")),
                        Kph = reader.GetInt32(reader.GetOrdinal("KPH")),
                        Timestamp = reader.GetDateTime(reader.GetOrdinal("Timestamp")),
                        LocationIdentifier = locationId
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve speed events for {LocationId} on {Start}", locationId, start);
            }

            return speedEvents;
        }

        public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
