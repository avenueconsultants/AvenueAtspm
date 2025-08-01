// This is the updated pedestrian aggregation service matching the new BigQuery-based pattern.

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
using Utah.Udot.Atspm.Data.Models.EventLogModels;
using Utah.Udot.Atspm.Repositories.ConfigurationRepositories;
using Utah.Udot.Atspm.Repositories.EventLogRepositories;



public class AggregatePedestrianToBigQueryService : IHostedService
{
    private readonly BigQueryClient _bigQueryClient;
    private readonly StorageClient _storageClient;
    private readonly ILogger<AggregatePedestrianToBigQueryService> _logger;
    private readonly ILocationRepository _locationRepository;
    private readonly IIndianaEventLogBQRepository _eventRepo;
    private readonly TransferCommandConfiguration _config;
    private readonly string _bucket = "salt-lake-mobility-event-uploads";
    private static readonly List<int> _cycleEventCodes = new() { 90, 45, 21, 22, 67, 68 };

    public AggregatePedestrianToBigQueryService(
        BigQueryClient bigQueryClient,
        StorageClient storageClient,
        ILogger<AggregatePedestrianToBigQueryService> logger,
        ILocationRepository locationRepository,
        IOptions<TransferCommandConfiguration> config,
        IIndianaEventLogBQRepository eventRepo)
    {
        _bigQueryClient = bigQueryClient;
        _storageClient = storageClient;
        _logger = logger;
        _locationRepository = locationRepository;
        _eventRepo = eventRepo;
        _config = config.Value;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var locations = string.IsNullOrWhiteSpace(_config.Locations)
            ? _locationRepository.GetList().Select(l => l.LocationIdentifier).ToList()
            : _config.Locations.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(s => s.Trim()).ToList();

        for (var day = DateOnly.FromDateTime(_config.Start); day <= DateOnly.FromDateTime(_config.End); day = day.AddDays(1))
        {
            _logger.LogInformation("Processing date {Date}", day);
            var results = new ConcurrentBag<PhasePedAggregation>();
            var startOfDay = DateTime.SpecifyKind(day.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
            var endOfDay = startOfDay.AddDays(1);

            await Parallel.ForEachAsync(locations, async (locationId, _) =>
            {
                try
                {
                    //var location = _locationRepository.GetLatestVersionOfLocation(locationId,  startOfDay);
                    var allEvents = _eventRepo.GetByLocationTimeAndEventCodes(locationId, startOfDay, endOfDay, _cycleEventCodes).ToList();
                    for (var binStart = startOfDay; binStart < endOfDay; binStart += TimeSpan.FromMinutes(15))
                    {
                        var binEnd = binStart.AddMinutes(15);
                        var binEvents = allEvents
                            .Where(e => e.Timestamp >= binStart && e.Timestamp <= binEnd)
                            .ToList();

                        if (!binEvents.Any()) continue;

                        var phaseNumbers = allEvents.Where(e => e.EventCode != 90).Select(e => e.EventParam).Distinct().ToList();
                        foreach (var phaseNumber in phaseNumbers)
                        {
                            //var approach = location.Approaches.FirstOrDefault(a => a.ProtectedPhaseNumber == phaseNumber);
                            List<int> pedDetecotrs = new List<int> { phaseNumber };
                            //var isPedestrianPhaseOverlap = false;
                            //if (approach != null)
                            //{
                            //    pedDetecotrs = approach.GetPedDetectorsFromApproach();
                            //    isPedestrianPhaseOverlap = approach.IsPedestrianPhaseOverlap;
                            //}
                            //else
                            //{
                            if (binEvents.Any(e => e.EventParam == phaseNumber && e.EventCode == 21 || e.EventCode == 22))
                            {
                                results.Add(GetPedPhaseAggregations(locationId, phaseNumber, pedDetecotrs, false, binStart, binEvents));
                            }
                            //if (binEvents.Any(e => e.EventParam == phaseNumber && e.EventCode == 67 || e.EventCode == 68))
                            //{
                            //    results.Add(GetPedPhaseAggregations(locationId, phaseNumber, pedDetecotrs, true, binStart, binEvents));
                            //}
                            //}

                            //results.Add(pedPhase);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing location {Location} on {Date}", locationId, day);
                }
            });

            if (results.Any())
            {
                var fileName = $"cycleaggregations/all-{day:yyyyMMdd}-{Guid.NewGuid():N}.ndjson.gz";
                var tempPath = Path.Combine(Path.GetTempPath(), Path.GetFileName(fileName));
                await WriteToFileAsync(results.ToList(), tempPath);
                await UploadToGcsAsync(fileName, tempPath);
                await LoadToBigQueryAsync(fileName);
                File.Delete(tempPath);
            }
        }
    }

    private async Task WriteToFileAsync(List<PhasePedAggregation> records, string filePath)
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
        var job = _bigQueryClient.CreateLoadJob(
            new[] { gcsUri },
            new TableReference
            {
                ProjectId = _bigQueryClient.ProjectId,
                DatasetId = "ATSPM",
                TableId = "PhasePedAggregations"
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
            new() { Name = "LocationIdentifier", Type = "STRING", Mode = "REQUIRED" },
            new() { Name = "PhaseNumber", Type = "INTEGER", Mode = "REQUIRED" },
            new() { Name = "IsPedestrianOverlap", Type = "BOOLEAN", Mode = "REQUIRED" },
            new() { Name = "PedCycles", Type = "INTEGER", Mode = "REQUIRED" },
            new() { Name = "PedDelaySum", Type = "INTEGER", Mode = "REQUIRED" },
            new() { Name = "MinPedDelay", Type = "INTEGER", Mode = "REQUIRED" },
            new() { Name = "MaxPedDelay", Type = "INTEGER", Mode = "REQUIRED" },
            new() { Name = "PedRequests", Type = "INTEGER", Mode = "REQUIRED" },
            new() { Name = "ImputedPedCallsRegistered", Type = "INTEGER", Mode = "REQUIRED" },
            new() { Name = "UniquePedDetections", Type = "INTEGER", Mode = "REQUIRED" },
            new() { Name = "PedBeginWalkCount", Type = "INTEGER", Mode = "REQUIRED" },
            new() { Name = "PedCallsRegisteredCount", Type = "INTEGER", Mode = "REQUIRED" }
        }
    };


    public PhasePedAggregation GetPedPhaseAggregations(string locationIdentifier, int phaseNumber, List<int> detectorChannels, bool isPedestrianOverlap, DateTime bindStartTime, List<IndianaEvent> events)
    {
        if (!events.Any()) return null;
        var phaseEventCodes = isPedestrianOverlap ? new List<int> { 45, 67, 68 } : new List<int> { 45, 21, 22 };
        var phaseEvents = events.Where(e => phaseEventCodes.Contains(e.EventCode) && e.EventParam == phaseNumber).OrderBy(e => e.Timestamp).ToList();
        var detectorEvents = events.Where(e => e.EventCode == 90 && detectorChannels.Contains(e.EventParam)).OrderBy(e => e.Timestamp).ToList();
        var allEvents = phaseEvents.Concat(detectorEvents).OrderBy(e => e.Timestamp).ToList();


        var beginWalkCode = isPedestrianOverlap ? 67 : 21;
        var beginClearanceCode = isPedestrianOverlap ? 68 : 22;

        var cycles = PedDelayFunctions.GetPedCycles(allEvents, beginWalkCode, beginClearanceCode);
        var (totalDelay, minDelay, maxDelay) = PedDelayFunctions.GetDelayStats(cycles);

        var result = new PhasePedAggregation
        {
            LocationIdentifier = locationIdentifier,
            PhaseNumber = phaseNumber,
            IsPedestrianOverlap = isPedestrianOverlap,
            BinStartTime = bindStartTime,
            PedCycles = cycles.Count,
            PedDelaySum = totalDelay,
            MinPedDelay = minDelay,
            MaxPedDelay = maxDelay,
            PedRequests = events.Count(e => e.EventCode == 90),
            PedCallsRegisteredCount = allEvents.Count(e => e.EventCode == 45),
            PedBeginWalkCount = allEvents.Count(e => e.EventCode == beginWalkCode),
            ImputedPedCallsRegistered = detectorEvents.Count(),//PedDelayFunctions.CountImputedPedCalls(events, beginWalkCode),
            UniquePedDetections = PedDelayFunctions.CountUniquePedDetections(detectorEvents)
        };
        return result;
    }

}

public static class PedDelayFunctions
{

    public static List<PedCycle> GetPedCycles(List<IndianaEvent> events, int beginWalkCode, int beginClearanceCode)
    {
        //var cycleEvents = new List<IndianaEvent>();
        var cycleEvents = new List<IndianaEvent>();
        for (int i = 0; i < events.Count; i++)
        {
            if (events[i].EventCode == 90)
            {
                cycleEvents.Add(events[i]);

                while (i + 1 < events.Count && events[i + 1].EventCode == 90)
                {
                    i++;
                }
            }
            else if (events[i].EventCode != 45)
            {
                cycleEvents.Add(events[i]);
            }
        }
        //cycleEvents.AddRange(tempEvents.OrderBy(t => t.Timestamp).ToList());
        //cycleEvents.AddRange(events.Where(e => e.EventCode != 45 && e.EventCode != 90).ToList());
        cycleEvents = cycleEvents.OrderBy(e => e.Timestamp).ToList();
        var cycles = new List<PedCycle>();
        if (cycleEvents.Count > 1 && cycleEvents[0].EventCode == 90 && cycleEvents[1].EventCode == beginWalkCode)
        {
            cycles.Add(new PedCycle(cycleEvents[1].Timestamp, cycleEvents[0].Timestamp));  // Middle of the event
        }

        for (var i = 0; i < cycleEvents.Count - 2; i++)
        {
            // there are four possibilities:
            // 1) 22, 90 , 21
            //   time between 90 and 21, count++
            // 2) 21, 90, 22
            //    time = 0 , count++
            // 3) 22, 90, 22 
            //    ignore this possibility
            // 4) 21, 90, 21
            //    time betweeen 90 and last 21, count++
            //
            if (cycleEvents[i].EventCode == beginClearanceCode &&
                cycleEvents[i + 1].EventCode == 90 &&
                cycleEvents[i + 2].EventCode == beginWalkCode)
            {
                cycles.Add(new PedCycle(cycleEvents[i + 2].Timestamp, cycleEvents[i + 1].Timestamp));  // this is case 1
                i++;
            }
            else if (cycleEvents[i].EventCode == beginWalkCode &&
                     cycleEvents[i + 1].EventCode == 90 &&
                     cycleEvents[i + 2].EventCode == beginClearanceCode)
            {
                cycles.Add(new PedCycle(cycleEvents[i].Timestamp, cycleEvents[i + 1].Timestamp));  // this is case 2
                i++;
            }
            else if (cycleEvents[i].EventCode == beginWalkCode &&
                     cycleEvents[i + 1].EventCode == 90 &&
                     cycleEvents[i + 2].EventCode == beginWalkCode)
            {
                cycles.Add(new PedCycle(cycleEvents[i + 2].Timestamp, cycleEvents[i + 1].Timestamp));  // this is case 4
                i++;
            }
            //else
            //{
            //    Console.WriteLine($"Unexpected event sequence at index {i}: {cycleEvents[i].EventCode}, {cycleEvents[i + 1].EventCode}, {cycleEvents[i + 2].EventCode}");
            //}
            //else if (cycleEvents[i].EventCode == beginWalkCode && (cycles.Count == 0 || cycleEvents[i].Timestamp != cycles.Last().BeginWalk))
            //{
            //    PedBeginWalkEvents.Add(cycleEvents[i]); // collected loose BeginWalkEvents for chart
            //}
        }
        //if (cycleEvents.Count >= 1)
        //{
        //    if (cycleEvents[Events.Count - 1].EventCode == beginWalkCode)
        //        PedBeginWalkEvents.Add(cycleEvents[cycleEvents.Count - 1]);
        //}
        //if (cycleEvents.Count >= 2)
        //{
        //    if (cycleEvents[cycleEvents.Count - 2].EventCode == beginWalkCode)
        //        PedBeginWalkEvents.Add(cycleEvents[cycleEvents.Count - 2]);
        //}
        return cycles;
    }

    public static (int total, int min, int max) GetDelayStats(List<PedCycle> cycles)
    {
        if (cycles.Count == 0) return (0, 0, 0);
        var total = (int)Math.Round(cycles.Sum(c => c.Delay));
        var min = (int)Math.Round(cycles.Min(c => c.Delay));
        var max = (int)Math.Round(cycles.Max(c => c.Delay));
        return (total, min, max);
    }

    public static int CountUniquePedDetections(List<IndianaEvent> detections)
    {
        //var detections = events.Where(e => e.EventCode == 90).OrderBy(e => e.Timestamp).ToList();
        if (!detections.Any()) return 0;

        int count = 1;
        var last = detections[0].Timestamp;

        for (int i = 1; i < detections.Count; i++)
        {
            if ((detections[i].Timestamp - last).TotalSeconds >= 15)
            {
                count++;
                last = detections[i].Timestamp;
            }
        }
        return count;
    }

    public static int CountImputedPedCalls(List<IndianaEvent> events, int beginWalkCode)
    {
        int count = 0;
        for (int i = 1; i < events.Count; i++)
        {
            if (events[i].EventCode == 90 && events[i - 1].EventCode == beginWalkCode)
            {
                count++;
            }
        }
        return count;
    }
}

public class PhasePedAggregation
{
    public string LocationIdentifier { get; set; } = default!;
    public int PhaseNumber { get; set; }
    public bool IsPedestrianOverlap { get; set; }
    public DateTime BinStartTime { get; set; }
    public int PedCycles { get; set; }
    public int PedDelaySum { get; set; }
    public int MinPedDelay { get; set; }
    public int MaxPedDelay { get; set; }
    public int PedRequests { get; set; }
    public int ImputedPedCallsRegistered { get; set; }
    public int UniquePedDetections { get; set; }
    public int PedBeginWalkCount { get; set; }
    public int PedCallsRegisteredCount { get; set; }
}

public class PedCycle
{
    public PedCycle(DateTime beginWalk, DateTime callRegistered)
    {
        BeginWalk = beginWalk;
        CallRegistered = callRegistered;
    }

    public DateTime BeginWalk { get; }
    public DateTime CallRegistered { get; }
    public double Delay => Math.Abs((BeginWalk - CallRegistered).TotalSeconds);
}
