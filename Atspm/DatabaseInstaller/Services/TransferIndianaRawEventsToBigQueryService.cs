// Streams one NDJSON.GZ file per location per day, with parallel GCS upload using a safe file-handling pattern.
using DatabaseInstaller.Commands;
using Google.Cloud.BigQuery.V2;
using Google.Apis.Bigquery.v2.Data;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Polly.Retry;
using Polly;
using Google.Cloud.Storage.V1;
using Utah.Udot.Atspm.Data.Models.EventLogModels;
using Utah.Udot.Atspm.Data.Models;
using Utah.Udot.Atspm.Repositories.ConfigurationRepositories;
using System.Collections.Concurrent;
using System.IO.Compression;

namespace DatabaseInstaller.Services;

public class TransferIndianaRawEventsToBigQueryService
    : TransferIndianaEventsToBigQueryBase
{
    public TransferIndianaRawEventsToBigQueryService(
        ILogger<TransferIndianaEventsToBigQueryService> logger,
        ILocationRepository locationRepository,
        IOptions<TransferCommandConfiguration> config,
        BigQueryClient client,
        StorageClient storageClient)
        : base(client, storageClient, logger, locationRepository, config)
    {
    }

    protected override async Task<List<IndianaEventDto>> GetIndianaEventsAsync(string locationId, DateTime day)
    {
        var events = new List<IndianaEventDto>();
        const string query = @"
        SELECT SignalID, Timestamp, EventCode, EventParam 
        FROM dbo.Controller_Event_Log 
        WHERE SignalId = @SignalId AND Timestamp >= @Start AND Timestamp < @End";

        try
        {
            await using var conn = new SqlConnection(_config.Source);
            await conn.OpenAsync();

            using var cmd = new SqlCommand(query, conn);
            cmd.Parameters.AddWithValue("@SignalId", locationId);
            cmd.Parameters.AddWithValue("@Start", day.Date);
            cmd.Parameters.AddWithValue("@End", day.Date.AddDays(1));

            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                int code = reader.GetInt32(2);
                int param = reader.GetInt32(3);

                if (code is >= short.MinValue and <= short.MaxValue &&
                    param is >= short.MinValue and <= short.MaxValue)
                {
                    events.Add(new IndianaEventDto
                    {
                        LocationIdentifier = reader.GetString(0),
                        Timestamp = reader.GetDateTime(1),
                        EventCode = code,
                        EventParam = param
                    });
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve raw events for {LocationId} on {Date}", locationId, day);
        }

        return events;
    }

}



//public class TransferIndianaRawEventsToBigQueryService2 : IHostedService
//{
//    private async Task<FileStream> RetryOpenReadAsync(string path)
//    {
//        for (int i = 0; i < 5; i++)
//        {
//            try
//            {
//                return File.OpenRead(path);
//            }
//            catch (IOException) when (i < 4)
//            {
//                await Task.Delay(100);
//            }
//        }
//        throw new IOException($"Could not open file for reading after retries: {path}");
//    }

//    private async Task RetryDeleteAsync(string path)
//    {
//        for (int i = 0; i < 5; i++)
//        {
//            try
//            {
//                File.Delete(path);
//                return;
//            }
//            catch (IOException) when (i < 4)
//            {
//                await Task.Delay(100);
//            }
//        }
//        throw new IOException($"Could not delete file after retries: {path}");
//    }

//    private readonly BigQueryClient _client;
//    private readonly StorageClient _storageClient;
//    private readonly ILogger<TransferIndianaRawEventsToBigQueryService> _logger;
//    private readonly ILocationRepository _locationRepository;
//    private readonly TransferCommandConfiguration _config;
//    private readonly string _table = "IndianaEventLogs";
//    private readonly string _bucket = "salt-lake-mobility-event-uploads";
//    private readonly string _gapTable = "IndianaEventLogGaps";

//    private readonly AsyncRetryPolicy _retryPolicy = Polly.Policy
//        .Handle<Exception>()
//        .WaitAndRetryAsync(new[]
//        {
//            TimeSpan.FromSeconds(30),
//            TimeSpan.FromMinutes(10),
//            TimeSpan.FromHours(1),
//        }, (ex, span, retry, ctx) =>
//        {
//            Console.WriteLine($"[Retry {retry}] Waiting {span.TotalMinutes:n1} min due to: {ex.Message}");
//        });

//    public TransferIndianaRawEventsToBigQueryService(
//        ILogger<TransferIndianaRawEventsToBigQueryService> logger,
//        ILocationRepository locationRepository,
//        IOptions<TransferCommandConfiguration> config,
//        BigQueryClient client,
//        StorageClient storageClient)
//    {
//        _logger = logger;
//        _locationRepository = locationRepository;
//        _config = config.Value;
//        _client = client;
//        _storageClient = storageClient;
//    }

//    public async Task StartAsync(CancellationToken cancellationToken)
//    {
//        var locationIds = !string.IsNullOrEmpty(_config.Locations)
//            ? _config.Locations.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(x => x.Trim()).ToList()
//            : _locationRepository.GetList().Select(l => l.LocationIdentifier).Distinct().ToList();

//        for (var currentDay = DateOnly.FromDateTime(_config.Start); currentDay <= DateOnly.FromDateTime(_config.End); currentDay = currentDay.AddDays(1))
//        {
//            var gcsFiles = new ConcurrentBag<string>();
//            var batchId = Guid.NewGuid().ToString("N");

//            var tasks = locationIds.Select(id => ProcessLocationAsync(id, currentDay, batchId, gcsFiles));
//            await Task.WhenAll(tasks);

//            if (!gcsFiles.Any())
//            {
//                _logger.LogWarning("No events found for any location on {Date}", currentDay);
//                continue;
//            }

//            await LoadToBigQueryAsync(gcsFiles, currentDay);
//        }
//    }

//    private async Task LoadToBigQueryAsync(ConcurrentBag<string> gcsFiles, DateOnly currentDay)
//    {
//        _logger.LogInformation("Starting BigQuery load for {Date} with {FileCount} files", currentDay, gcsFiles.Count);

//        var schema = new TableSchemaBuilder
//    {
//        { "LocationIdentifier", BigQueryDbType.String, BigQueryFieldMode.Required },
//        { "Timestamp", BigQueryDbType.DateTime, BigQueryFieldMode.Required },
//        { "EventCode", BigQueryDbType.Int64, BigQueryFieldMode.Required },
//        { "EventParam", BigQueryDbType.Int64, BigQueryFieldMode.Required }
//    }.Build();

//        var tableRef = new TableReference
//        {
//            ProjectId = _client.ProjectId,
//            DatasetId = "ATSPM",
//            TableId = _table
//        };

//        var job = _client.CreateLoadJob(
//            gcsFiles,
//            tableRef,
//            schema: schema,
//            options: new CreateLoadJobOptions
//            {
//                WriteDisposition = WriteDisposition.WriteAppend,
//                SourceFormat = FileFormat.NewlineDelimitedJson,
//                Autodetect = false
//            });

//        _logger.LogInformation("Created BigQuery load job: {JobId}", job.Reference.JobId);

//        job = job.PollUntilCompleted();

//        if (job.Status.State == "DONE" && job.Status.ErrorResult == null)
//        {
//            _logger.LogInformation("BigQuery load job {JobId} succeeded for {Date}", job.Reference.JobId, currentDay);

//            foreach (var gcsPath in gcsFiles)
//            {
//                var objectPath = gcsPath.Replace($"gs://{_bucket}/", "");
//                await _storageClient.DeleteObjectAsync(_bucket, objectPath);
//                _logger.LogInformation("Deleted GCS file: {File}", gcsPath);
//            }
//        }
//        else
//        {
//            _logger.LogError("BigQuery load job {JobId} failed for {Date}: {Error}", job.Reference.JobId, currentDay, job.Status.ErrorResult?.Message);

//            if (job.Status.Errors != null)
//            {
//                foreach (var error in job.Status.Errors)
//                {
//                    _logger.LogError("BigQuery error: {Reason} - {Message}", error.Reason, error.Message);
//                }
//            }
//        }
//    }



//    private async Task ProcessLocationAsync(string locationId, DateOnly currentDay, string batchId, ConcurrentBag<string> gcsFiles)
//    {
//        try
//        {
//            _logger.LogInformation("Starting processing for Location {LocationId} on {Date}", locationId, currentDay);

//            var events = await _retryPolicy.ExecuteAsync(() =>
//                GetRawDailyEvents(locationId, currentDay.ToDateTime(TimeOnly.MinValue)));

//            _logger.LogInformation("Retrieved {Count} events for Location {LocationId} on {Date}", events.Count, locationId, currentDay);

//            if (!events.Any())
//            {
//                _logger.LogWarning("No events found for Location {LocationId} on {Date}", locationId, currentDay);
//                await LogGapToBigQuery(locationId, currentDay);
//                return;
//            }

//            var gcsObject = $"indiana/raw/{locationId}-{currentDay:yyyyMMdd}-{batchId}.ndjson.gz";
//            var tempFilePath = Path.Combine(Path.GetTempPath(), Path.GetFileName(gcsObject));

//            _logger.LogInformation("Writing events to temporary file: {TempFilePath}", tempFilePath);

//            using (var fileStream = new FileStream(tempFilePath, FileMode.Create, FileAccess.Write, FileShare.None))
//            using (var gzip = new GZipStream(fileStream, CompressionLevel.Optimal))
//            using (var writer = new StreamWriter(gzip))
//            {
//                foreach (var evt in events)
//                {
//                    var dto = new IndianaEventDto
//                    {
//                        LocationIdentifier = evt.SignalIdentifier.ToString(),
//                        Timestamp = evt.Timestamp,
//                        EventCode = (short)evt.EventCode,
//                        EventParam = (short)evt.EventParam
//                    };
//                    await writer.WriteLineAsync(JsonConvert.SerializeObject(dto));
//                }
//                await writer.FlushAsync();
//            }

//            await Task.Delay(100); // Ensure file is fully flushed
//            await using var stream = await RetryOpenReadAsync(tempFilePath);

//            _logger.LogInformation("Uploading file to GCS: gs://{Bucket}/{Object}", _bucket, gcsObject);
//            await _storageClient.UploadObjectAsync(_bucket, gcsObject, "application/gzip", stream);
//            gcsFiles.Add($"gs://{_bucket}/{gcsObject}");

//            _logger.LogInformation("Upload complete: Location {LocationId} on {Date}, File: {File}, Event Count: {Count}",
//                locationId, currentDay, gcsObject, events.Count);

//            stream.Close();
//            await RetryDeleteAsync(tempFilePath);
//        }
//        catch (Exception ex)
//        {
//            _logger.LogError(ex, "Error processing Location {LocationId} on {Date}", locationId, currentDay);
//        }
//    }



//    private async Task LogGapToBigQuery(string locationId, DateOnly date)
//    {
//        var row = new BigQueryInsertRow
//        {
//            { "LocationIdentifier", locationId.ToString() },
//            { "MissingDate", date.ToString("yyyy-MM-dd") },
//            { "LoggedAt", DateTime.UtcNow }
//        };

//        await _retryPolicy.ExecuteAsync(() =>
//    _client.InsertRowAsync("ATSPM", _gapTable, row));

//    }

//    private async Task<List<ControllerEventLog>> GetRawDailyEvents(string locationId, DateTime date)
//    {
//        var events = new List<ControllerEventLog>();
//        const string query = @"SELECT SignalID, Timestamp, EventCode, EventParam FROM dbo.Controller_Event_Log WHERE SignalId = @SignalId AND Timestamp >= @Start AND Timestamp < @End";

//        try
//        {
//            await using var conn = new SqlConnection(_config.Source);
//            await conn.OpenAsync();

//            using var cmd = new SqlCommand(query, conn);
//            cmd.Parameters.AddWithValue("@SignalId", locationId);
//            cmd.Parameters.AddWithValue("@Start", date.Date);
//            cmd.Parameters.AddWithValue("@End", date.Date.AddDays(1));

//            using var reader = await cmd.ExecuteReaderAsync();
//            while (await reader.ReadAsync())
//            {
//                events.Add(new ControllerEventLog
//                {
//                    SignalIdentifier = reader.GetString(0),
//                    Timestamp = reader.GetDateTime(1),
//                    EventCode = reader.GetInt32(2),
//                    EventParam = reader.GetInt32(3)
//                });
//            }
//        }
//        catch (Exception ex)
//        {
//            _logger.LogError(ex, "Failed to retrieve raw events for {LocationId} on {Date}", locationId, date);
//        }

//        return events;
//    }

//    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

//    private class IndianaEventDto
//    {
//        [JsonProperty("LocationIdentifier")]
//        [JsonConverter(typeof(ForceStringConverter))]
//        public string LocationIdentifier { get; set; }
//        public DateTime Timestamp { get; set; }
//        public short EventCode { get; set; }
//        public short EventParam { get; set; }
//    }
//}

//public class ForceStringConverter : JsonConverter<string>
//{
//    public override void WriteJson(JsonWriter writer, string value, JsonSerializer serializer)
//    {
//        writer.WriteValue(value?.ToString());
//    }

//    public override string ReadJson(JsonReader reader, Type objectType, string existingValue, bool hasExistingValue, JsonSerializer serializer)
//    {
//        return reader.Value?.ToString();
//    }
//}
