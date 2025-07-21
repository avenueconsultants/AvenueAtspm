using DatabaseInstaller.Commands;
using Google.Apis.Bigquery.v2.Data;
using Google.Cloud.BigQuery.V2;
using Google.Cloud.Storage.V1;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using System.Collections.Concurrent;
using System.IO.Compression;
using Utah.Udot.Atspm.Business.Common;
using Utah.Udot.Atspm.Repositories.ConfigurationRepositories;
using Utah.Udot.Atspm.Repositories.EventLogRepositories;

public class CycleAggregationService : IHostedService
{
    private readonly BigQueryClient _bqClient;
    private readonly StorageClient _storageClient;
    private readonly ILogger<CycleAggregationService> _logger;
    private readonly ILocationRepository _locationRepository;
    private readonly IIndianaEventLogBQRepository _eventRepo;
    private readonly CycleService _cycleService;
    private readonly TransferCommandConfiguration _config;
    private readonly string _bucket = "salt-lake-mobility-event-uploads";

    public CycleAggregationService(
        BigQueryClient bqClient,
        StorageClient storageClient,
        ILogger<CycleAggregationService> logger,
        ILocationRepository locationRepository,
        IIndianaEventLogBQRepository eventRepo,
        IOptions<TransferCommandConfiguration> config,
        CycleService cycleService
        )
    {
        _bqClient = bqClient;
        _storageClient = storageClient;
        _logger = logger;
        _locationRepository = locationRepository;
        _eventRepo = eventRepo;
        _cycleService = cycleService;
        _config = config.Value;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var locations = string.IsNullOrWhiteSpace(_config.Locations)
            ? _locationRepository.GetList().Select(l => l.LocationIdentifier).ToList()
            : _config.Locations.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(s => s.Trim()).ToList();

        for (var day = DateOnly.FromDateTime(_config.Start); day <= DateOnly.FromDateTime(_config.End); day = day.AddDays(1))
        {
            var records = new ConcurrentBag<CycleAggregationDto>();
            var startOfDay = DateTime.SpecifyKind(day.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
            var endOfDay = startOfDay.AddDays(1).AddMinutes(15);

            await Parallel.ForEachAsync(locations, async (locationId, _) =>
            {
                try
                {
                    var allEvents = _eventRepo.GetByLocationTimeAndEventCodes(locationId, startOfDay, endOfDay, _cycleEventCodes);
                    for (var binStart = startOfDay; binStart < endOfDay; binStart += TimeSpan.FromMinutes(15))
                    {
                        var binEnd = binStart.AddMinutes(15);
                        var binEvents = allEvents
                            .Where(e => e.Timestamp >= binStart && e.Timestamp <= binEnd.AddMinutes(15))
                            .ToList();

                        if (!binEvents.Any()) continue;

                        var phaseGroups = binEvents.GroupBy(e => e.EventParam).ToList();

                        Parallel.ForEach(phaseGroups, group =>
                        {
                            var phase = group.Key;
                            var ordered = group.OrderBy(e => e.Timestamp).ToList();

                            var redCycles = _cycleService.GetRedToRedCycles(binStart, binEnd, ordered);
                            var greenCycles = _cycleService.GetGreenToGreenCycles(binStart, binEnd, ordered);

                            records.Add(new CycleAggregationDto
                            {
                                BinStartTime = binStart,
                                SignalIdentifier = locationId,
                                PhaseNumber = phase,
                                RedTime = (int)Math.Round(redCycles.Sum(c => c.TotalRedTimeSeconds)),
                                YellowTime = (int)Math.Round(redCycles.Sum(c => c.TotalYellowTimeSeconds)),
                                GreenTime = (int)Math.Round(greenCycles.Sum(c => c.TotalGreenTimeSeconds)),
                                TotalRedToRedCycles = redCycles.Count,
                                TotalGreenToGreenCycles = greenCycles.Count
                            });
                        });
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing location {Location} on {Date}", locationId, day);
                }
            });

            if (records.Count > 0)
            {
                var fileName = $"cycleaggregations/all-{day:yyyyMMdd}-{Guid.NewGuid():N}.ndjson.gz";
                var tempPath = Path.Combine(Path.GetTempPath(), Path.GetFileName(fileName));
                await WriteToFileAsync(records.ToList(), tempPath);
                await UploadToGcsAsync(fileName, tempPath);
                await LoadToBigQueryAsync(fileName);
                File.Delete(tempPath);
            }
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private static readonly List<int> _cycleEventCodes = new() { 1, 8, 9, 61, 63, 64 };

    private async Task WriteToFileAsync(List<CycleAggregationDto> records, string filePath)
    {
        using var fileStream = new FileStream(filePath, FileMode.Create, FileAccess.Write);
        using var gzip = new GZipStream(fileStream, CompressionLevel.Optimal);
        using var writer = new StreamWriter(gzip);

        var settings = new JsonSerializerSettings
        {
            DateFormatString = "yyyy-MM-dd'T'HH:mm:ss"
        };

        foreach (var record in records)
        {
            string json = JsonConvert.SerializeObject(record, settings);
            await writer.WriteLineAsync(json);
        }
    }


    private async Task UploadToGcsAsync(string objectName, string filePath)
    {
        using var stream = File.OpenRead(filePath);
        await _storageClient.UploadObjectAsync(_bucket, objectName, "application/gzip", stream);
        _logger.LogInformation("Uploaded to GCS: gs://{Bucket}/{Object}", _bucket, objectName);
    }

    private async Task LoadToBigQueryAsync(string objectName)
    {
        var gcsUri = $"gs://{_bucket}/{objectName}";
        var job = _bqClient.CreateLoadJob(
            new[] { gcsUri },
            new TableReference
            {
                ProjectId = _bqClient.ProjectId,
                DatasetId = "ATSPM",
                TableId = "CycleAggregations"
            },
            schema: GetSchema(),
            new CreateLoadJobOptions
            {
                SourceFormat = FileFormat.NewlineDelimitedJson,
                WriteDisposition = WriteDisposition.WriteAppend
            });

        job = job.PollUntilCompleted();
        if (job.Status.ErrorResult != null)
        {
            _logger.LogError("BQ job failed: {Error}", job.Status.ErrorResult.Message);
            return;
        }

        _logger.LogInformation("BQ load completed. Deleting uploaded GCS file: {File}", objectName);
        try
        {
            await _storageClient.DeleteObjectAsync(_bucket, objectName);
            _logger.LogInformation("Deleted GCS object: gs://{Bucket}/{Object}", _bucket, objectName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete GCS object: gs://{Bucket}/{Object}", _bucket, objectName);
        }
    }


    private TableSchema GetSchema() => new TableSchema
    {
        Fields = new List<TableFieldSchema>
        {
            new() { Name = "BinStartTime", Type = "DATETIME", Mode = "REQUIRED" },
            new() { Name = "SignalIdentifier", Type = "STRING", Mode = "REQUIRED" },
            new() { Name = "PhaseNumber", Type = "INTEGER", Mode = "REQUIRED" },
            new() { Name = "RedTime", Type = "INTEGER", Mode = "REQUIRED" },
            new() { Name = "YellowTime", Type = "INTEGER", Mode = "REQUIRED" },
            new() { Name = "GreenTime", Type = "INTEGER", Mode = "REQUIRED" },
            new() { Name = "TotalRedToRedCycles", Type = "INTEGER", Mode = "REQUIRED" },
            new() { Name = "TotalGreenToGreenCycles", Type = "INTEGER", Mode = "REQUIRED" }
        }
    };
}

public class CycleAggregationDto
{
    public DateTime BinStartTime { get; set; }
    public string SignalIdentifier { get; set; }
    public int PhaseNumber { get; set; }
    public int RedTime { get; set; }
    public int YellowTime { get; set; }
    public int GreenTime { get; set; }
    public int TotalRedToRedCycles { get; set; }
    public int TotalGreenToGreenCycles { get; set; }
}
