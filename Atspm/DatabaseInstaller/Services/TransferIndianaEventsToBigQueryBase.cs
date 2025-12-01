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
    protected readonly string _bucket = "rail-road-event-uploads";

    protected abstract string TableName { get; }
    protected abstract TableSchema GetSchema();
    protected abstract Task<List<T>> GetEventsAsync(string locationId, DateTime day);

    protected readonly AsyncRetryPolicy _retryPolicy = Polly.Policy
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
        //var configLocations = "1008,1011,1013,1014,1015,1016,1017,1018,1019,1020,1021,1022,1023,1024,1028,1029,1030,1031,1032,1033,1034,1035,1036,1037,1038,1039,1040,1041,1042,1043,1044,1054,1055,1060,1064,1065,1071,1083,1084,1091,1093,1097,1101,1107,1112,1113,1114,1119,1120,1122,1136,1143,1144,1146,1147,1148,1149,1150,1154,1157,1161,1163,1166,1168,1172,1177,1178,1180,1181,1183,1202,1203,1205,1206,1211,1213,1215,1216,1217,1218,1219,1220,1221,1222,1223,1224,1234,1235,1236,1237,1238,1241,1511,1512,1801,1802,1804,1813,1814,1818,1820,1822,1823,1824,1828,3002,3003,4019,4020,4033,4034,4035,4036,4037,4067,4120,4123,4147,4148,4151,4152,4153,4157,4170,4171,4327,4328,4358,4359,4362,4363,4365,4366,4367,4368,4370,4413,4502,4506,4522,4525,4526,4528,4529,4530,4532,4534,4604,4620,4621,4623,4626,4629,4631,4635,4640,4641,4642,4643,4644,4731,4739,4742,4802,4809,4821,4824,4835,4836,4843,4852,4856,4859,4864,4868,4883,4885,4890,4891,5045,5063,5064,5071,5072,5085,5086,5087,5088,5097,5111,5117,5124,5125,5130,5141,5172,5182,5184,5193,5196,5197,5201,5203,5212,5229,5263,5319,5330,5342,5372,5387,5421,5525,5528,5613,5628,5629,5633,5753,5754,5785,5821,5825,5878,5935,5951,6006,6013,6016,6020,6021,6024,6025,6026,6027,6028,6029,6033,6043,6044,6045,6057,6058,6066,6077,6131,6132,6134,6138,6157,6192,6193,6236,6309,6312,6390,6391,6395,6430,6452,6465,6532,6561,6803,6850,6851,6853,6855,7000,7001,7005,7006,7007,7025,7039,7040,7041,7042,7043,7044,7045,7047,7051,7052,7053,7068,7073,7075,7076,7080,7088,7089,7090,7091,7093,7094,7095,7125,7126,7127,7128,7131,7132,7133,7135,7136,7138,7139,7140,7141,7142,7143,7151,7170,7171,7172,7175,7180,7181,7187,7188,7216,7224,7229,7234,7240,7243,7244,7245,7247,7248,7249,7250,7252,7255,7270,7271,7272,7273,7274,7286,7287,7294,7295,7315,7316,7366,7367,7368,7369,7370,7398,7421,7466,7475,7494,7495,7501,7571,7573,7616,7635,8201,8219,8502,8510,8520,8850";
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
