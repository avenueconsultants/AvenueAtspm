using DatabaseInstaller.Commands;
using Google.Apis.Bigquery.v2.Data;
using Google.Cloud.BigQuery.V2;
using Google.Cloud.Storage.V1;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Polly;
using Polly.Retry;
using System.Collections.Concurrent;
using System.IO.Compression;
using Utah.Udot.Atspm.Repositories.ConfigurationRepositories;

namespace DatabaseInstaller.Services;

public abstract class TransferEventLogsToBigQueryBase<T> : IHostedService where T : class
{
    protected readonly BigQueryClient _client;
    protected readonly StorageClient _storageClient;
    protected readonly ILogger _logger;
    protected readonly ILocationRepository _locationRepository;
    protected readonly TransferCommandConfiguration _config;
    protected readonly string _bucket = "salt-lake-mobility-event-uploads";

    protected abstract string TableName { get; }
    protected abstract TableSchema GetSchema();
    protected abstract Task<List<T>> GetEventsAsync(string locationId, DateTime day);

    protected readonly AsyncRetryPolicy _retryPolicy =Polly.Policy
        .Handle<Exception>()
        .WaitAndRetryAsync(new[]
        {
            TimeSpan.FromSeconds(30),
            TimeSpan.FromMinutes(10),
            TimeSpan.FromHours(1),
        }, (ex, span, retry, ctx) =>
        {
            Console.WriteLine($"[Retry {retry}] Waiting {span.TotalMinutes:n1} min due to: {ex.Message}");
        });

    protected TransferEventLogsToBigQueryBase(
        BigQueryClient client,
        StorageClient storageClient,
        ILogger logger,
        ILocationRepository locationRepository,
        IOptions<TransferCommandConfiguration> config)
    {
        _client = client;
        _storageClient = storageClient;
        _logger = logger;
        _locationRepository = locationRepository;
        _config = config.Value;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var locationIds = !string.IsNullOrEmpty(_config.Locations)
            ? _config.Locations.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(x => x.Trim()).ToList()
            : _locationRepository.GetList().Select(l => l.LocationIdentifier).Distinct().ToList();

        for (var currentDay = DateOnly.FromDateTime(_config.Start); currentDay <= DateOnly.FromDateTime(_config.End); currentDay = currentDay.AddDays(1))
        {
            var gcsFiles = new ConcurrentBag<string>();
            var batchId = Guid.NewGuid().ToString("N");

            var tasks = locationIds.Select(locationId =>
                ProcessLocationAsync(locationId, currentDay, batchId, gcsFiles));

            await Task.WhenAll(tasks);

            if (gcsFiles.Any())
            {
                await LoadToBigQueryAsync(gcsFiles, currentDay);
            }
            else
            {
                _logger.LogWarning("No events found for any location on {Date}", currentDay);
            }
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private async Task ProcessLocationAsync(string locationId, DateOnly currentDay, string batchId, ConcurrentBag<string> gcsFiles)
    {
        try
        {
            _logger.LogInformation("Starting processing for Location {LocationId} on {Date}", locationId, currentDay);

            var events = await _retryPolicy.ExecuteAsync(() => GetEventsAsync(locationId, currentDay.ToDateTime(TimeOnly.MinValue)));

            _logger.LogInformation("Retrieved {Count} events for Location {LocationId} on {Date}", events.Count, locationId, currentDay);

            if (!events.Any()) return;

            var gcsObject = $"events/{typeof(T).Name.ToLowerInvariant()}/{locationId}-{currentDay:yyyyMMdd}-{batchId}.ndjson.gz";
            var tempFilePath = Path.Combine(Path.GetTempPath(), Path.GetFileName(gcsObject));

            _logger.LogInformation("Writing events to temporary file: {TempFilePath}", tempFilePath);

            await _retryPolicy.ExecuteAsync(async () =>
            {
                using var fileStream = new FileStream(tempFilePath, FileMode.Create, FileAccess.Write, FileShare.None);
                using var gzip = new GZipStream(fileStream, CompressionLevel.Optimal);
                using var writer = new StreamWriter(gzip);

                foreach (var evt in events)
                {
                    await writer.WriteLineAsync(JsonConvert.SerializeObject(evt));
                }

                await writer.FlushAsync();
            });

            await Task.Delay(100);

            await _retryPolicy.ExecuteAsync(async () =>
            {
                await using var stream = RetryOpenRead(tempFilePath);
                await _storageClient.UploadObjectAsync(_bucket, gcsObject, "application/gzip", stream);
                stream.Close();
            });

            gcsFiles.Add($"gs://{_bucket}/{gcsObject}");

            _logger.LogInformation("Upload complete: Location {LocationId} on {Date}, File: {File}, Event Count: {Count}",
                locationId, currentDay, gcsObject, events.Count);

            await RetryDeleteAsync(tempFilePath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing Location {LocationId} on {Date}", locationId, currentDay);
        }
    }

    private async Task LoadToBigQueryAsync(ConcurrentBag<string> gcsFiles, DateOnly currentDay)
    {
        _logger.LogInformation("Starting BigQuery load for {Date} with {FileCount} files", currentDay, gcsFiles.Count);

        await _retryPolicy.ExecuteAsync(async () =>
        {
            var job = _client.CreateLoadJob(
                gcsFiles,
                new TableReference
                {
                    ProjectId = _client.ProjectId,
                    DatasetId = "ATSPM",
                    TableId = TableName
                },
                schema: GetSchema(),
                options: new CreateLoadJobOptions
                {
                    WriteDisposition = WriteDisposition.WriteAppend,
                    SourceFormat = FileFormat.NewlineDelimitedJson,
                    Autodetect = false
                });

            _logger.LogInformation("Created BigQuery load job: {JobId}", job.Reference.JobId);

            job = job.PollUntilCompleted();

            if (job.Status.State == "DONE" && job.Status.ErrorResult == null)
            {
                _logger.LogInformation("BigQuery load job {JobId} succeeded for {Date}", job.Reference.JobId, currentDay);

                foreach (var gcsPath in gcsFiles)
                {
                    var objectPath = gcsPath.Replace($"gs://{_bucket}/", "");
                    await _storageClient.DeleteObjectAsync(_bucket, objectPath);
                    _logger.LogInformation("Deleted GCS file: {File}", gcsPath);
                }
            }
            else
            {
                _logger.LogError("BigQuery load job {JobId} failed for {Date}: {Error}", job.Reference.JobId, currentDay, job.Status.ErrorResult?.Message);

                if (job.Status.Errors != null)
                {
                    foreach (var error in job.Status.Errors)
                    {
                        _logger.LogError("BigQuery error: {Reason} - {Message}", error.Reason, error.Message);
                    }
                }
            }
        });
    }

    private async Task RetryDeleteAsync(string path)
    {
        for (int i = 0; i < 5; i++)
        {
            try
            {
                File.Delete(path);
                return;
            }
            catch (IOException) when (i < 4)
            {
                await Task.Delay(100);
            }
        }
        throw new IOException($"Could not delete file after retries: {path}");
    }

    private FileStream RetryOpenRead(string path)
    {
        for (int i = 0; i < 5; i++)
        {
            try
            {
                return File.OpenRead(path);
            }
            catch (IOException) when (i < 4)
            {
                Thread.Sleep(100);
            }
        }
        throw new IOException($"Could not open file for reading after retries: {path}");
    }
}

public class IndianaEventDto
{
    [JsonProperty("LocationIdentifier")]
    [JsonConverter(typeof(ForceStringConverter))]
    public string LocationIdentifier { get; set; }
    public DateTime Timestamp { get; set; }
    public int EventCode { get; set; }
    public int EventParam { get; set; }
}

public class ForceStringConverter : JsonConverter<string>
{
    public override void WriteJson(JsonWriter writer, string value, JsonSerializer serializer)
    {
        writer.WriteValue(value?.ToString());
    }

    public override string ReadJson(JsonReader reader, Type objectType, string existingValue, bool hasExistingValue, JsonSerializer serializer)
    {
        return reader.Value?.ToString();
    }
}
