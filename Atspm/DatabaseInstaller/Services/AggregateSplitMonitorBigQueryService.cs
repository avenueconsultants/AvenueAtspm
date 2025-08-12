// This is the updated pedestrian aggregation service matching the new BigQuery-based pattern.

using DatabaseInstaller.Commands;
using Google.Apis.Bigquery.v2.Data;
using Google.Cloud.BigQuery.V2;
using Google.Cloud.Storage.V1;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using System.Collections.Concurrent;
using System.IO.Compression;
using Utah.Udot.Atspm.Business.Common;
using Utah.Udot.Atspm.Data.Models;
using Utah.Udot.Atspm.Data.Models.EventLogModels;
using Utah.Udot.Atspm.Extensions;
using Utah.Udot.Atspm.Repositories.ConfigurationRepositories;
using Utah.Udot.Atspm.Repositories.EventLogRepositories;



public class AggregateSplitMonitorToBigQueryService : IHostedService
{
    private readonly BigQueryClient _bigQueryClient;
    private readonly StorageClient _storageClient;
    private readonly ILocationRepository _locationRepository;
    private readonly IIndianaEventLogBQRepository _eventRepo;
    private readonly TransferCommandConfiguration _config;
    private readonly ILogger<AggregateSplitMonitorToBigQueryService> _logger;
    private readonly string _bucket = "salt-lake-mobility-event-uploads";
    private readonly IServiceProvider _serviceProvider;
    private static readonly List<int> _cycleEventCodes = new() { 1, 8, 11 };
    private AnalysisPhaseCollectionService analysisPhaseCollectionService;

    public AggregateSplitMonitorToBigQueryService(
        BigQueryClient bigQueryClient,
        StorageClient storageClient,
        ILogger<AggregateSplitMonitorToBigQueryService> logger,
        ILocationRepository locationRepository,
        IOptions<TransferCommandConfiguration> config,
        IIndianaEventLogBQRepository eventRepo,
        IServiceProvider serviceProvider)
    {
        _bigQueryClient = bigQueryClient;
        _storageClient = storageClient;
        _locationRepository = locationRepository;
        _eventRepo = eventRepo;
        _logger = logger;
        _config = config.Value;
        _serviceProvider = serviceProvider; // 👈 save it
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var stringLocations = "2335,1109,1019,1094,1151,1096,1097,7124,1169,7252,1026,1067,1076,1162,1103,1065,1066,1068,1069,1070,1071,1072,1073,1074,1075,1077,1078,1079,1080,1081,1082,1083,1085,1086,1087,1088,1089,1090,1091,1093,1095,1098,1099,1100,1101,1102,1104,1105,1106,1107,1110,1111,1112,1116,1117,1118,1119,1120,1121,1124,1125,1127,1128,1129,1131,1132,1133,1134,1135,1136,1138,1139,1141,1142,1153,1223,1224,1225,1226,1227,1228,1229,1801,7216,7217,7218,7219,7220,7222,7223,7241,7251,7366,7367,7368,7369,7370,7371,7372,7474,7503,7642,1032,1033,1034,1035,1037,1046,1047,1048,1049,1051,1052,1053,1054,1055,1058,1059,1060,1061,1062,1063,1163,1164,1165,1166,1202,1221,1222,1013,1017,1018,1020,1021,1022,1024,1025,1029,1031,7069,7122,7123,7125,7127,7128,7130,7132,7133,7135,7136,7137,7138,7139,7140,7141,7143,7144,7145,7146,7147,7148,7149,7150,7151,7254,7270,7274,7342,7619,1084,7221,7475,7633,7647,1056,1057,7129,7618,1146,1147,1148,1149,1150,1157,7224,7242,7243,7244,7245,7246,7247,7248,7249,7250,7635,1036,1038,1039,1040,1041,1042,1043,1044,1045,1168,1177,1178,1203,1205,1208,1220,1014,1015,1016,1023,1027,1028,1030,7126,7131,7134,7142,7180,7181,7182,7183,7184,7185,7186,7187,7253,7255,7271,7272,7273,1825,1826,1827,1155,1803,1805,1806,1807,1809,1810,1812,1154,1802,1804,1820,1172,1064,1822,7648,1204,7494,7466,7495,7444";
        //var stringLocations = "7183, 1022";
        var locations = stringLocations.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(s => s.Trim()).ToList();

        for (var day = DateOnly.FromDateTime(_config.Start); day <= DateOnly.FromDateTime(_config.End); day = day.AddDays(1))
        {
            _logger.LogInformation("Processing date {Date}", day);
            var results = new ConcurrentBag<PhaseSplitMonitorAggregationFinal>();
            var startOfDay = System.DateTime.SpecifyKind(day.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
            var endOfDay = startOfDay.AddDays(1);

            await Parallel.ForEachAsync(locations, async (locationId, _) =>
            {
                using var scope = _serviceProvider.CreateScope();

                var locationRepository = scope.ServiceProvider.GetRequiredService<ILocationRepository>();
                var eventRepo = scope.ServiceProvider.GetRequiredService<IIndianaEventLogBQRepository>();
                analysisPhaseCollectionService = scope.ServiceProvider.GetRequiredService<AnalysisPhaseCollectionService>();

                try
                {
                    var location = locationRepository.GetLatestVersionOfLocation(locationId, startOfDay);
                    if (location == null) return;
                    var allEvents = eventRepo.GetByLocationAndTimeRange(locationId, startOfDay, endOfDay).ToList();

                    if (allEvents.Any())
                    {
                        for (var binStart = startOfDay; binStart < endOfDay; binStart += TimeSpan.FromMinutes(15))
                        {
                            var binEnd = binStart.AddMinutes(15);
                            var binEvents = allEvents
                                .Where(e => e.Timestamp >= binStart.AddSeconds(-900) && e.Timestamp <= binEnd.AddSeconds(900))
                                .ToList();

                            if (!binEvents.Any()) continue;

                            var tuple = new Tuple<Location, IEnumerable<IndianaEvent>, DateTime, DateTime>(location, binEvents, binStart, binEnd);
                            var aggregatedEvents = SplitMonitorAggregationCalculation(tuple);

                            foreach (var result in aggregatedEvents)
                            {
                                if (result == null) continue;
                                result.BinStartTime = binStart;
                                //result.LocationIdentifier = location.LocationIdentifier;
                                result.LocationIdentifier = locationId;
                                results.Add(result);
                            }
                        }
                    }
                    else
                    {
                        //_logger.LogWarning("No events found for location {Location} on {Date}", locationId, day);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing location {Location} on {Date}", locationId, day);
                }
            });


            if (results.Any())
            {
                var fileName = $"splitMonitorAggregations/all-{day:yyyyMMdd}-{Guid.NewGuid():N}.ndjson.gz";
                var tempPath = Path.Combine(Path.GetTempPath(), Path.GetFileName(fileName));
                await WriteToFileAsync(results.ToList(), tempPath);
                await UploadToGcsAsync(fileName, tempPath);
                await LoadToBigQueryAsync(fileName);
                File.Delete(tempPath);
            }
        }
    }

    private async Task WriteToFileAsync(List<PhaseSplitMonitorAggregationFinal> records, string filePath)
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
                TableId = "SplitMonitorAggregations"
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
            new() { Name = "EightyFifthPercentileSplit", Type = "FLOAT", Mode = "REQUIRED" },
            new() { Name = "SkippedCount", Type = "INTEGER", Mode = "REQUIRED" },
            new() { Name = "DurrationInSeconds", Type = "FLOAT", Mode = "REQUIRED" },
            new() { Name = "PhaseCount", Type = "INTEGER", Mode = "REQUIRED" },
            new() { Name = "MaxCycles", Type = "INTEGER", Mode = "REQUIRED" },
            new() { Name = "MaxOuts", Type = "FLOAT", Mode = "REQUIRED" },
            new() { Name = "GapOuts", Type = "FLOAT", Mode = "REQUIRED" },
            new() { Name = "ForceOffs", Type = "FLOAT", Mode = "REQUIRED" },
            new() { Name = "AverageSplits", Type = "FLOAT", Mode = "REQUIRED" },
            new() { Name = "Start", Type = "DATETIME", Mode = "REQUIRED" },
            new() { Name = "End", Type = "DATETIME", Mode = "REQUIRED" }
        }
    };

    private IEnumerable<PhaseSplitMonitorAggregationFinal> SplitMonitorAggregationCalculation(Tuple<Location, IEnumerable<IndianaEvent>, DateTime, DateTime> input)
    {
        var phaseSplitMonitor = new List<PhaseSplitMonitorAggregationFinal>();
        var location = input.Item1;
        var indianaEvents = input.Item2;
        var start = input.Item3;
        var end = input.Item4;

        var pedEvents = indianaEvents.Where(e =>
                new List<short>
                {
                    21,
                    23
                }.Contains(e.EventCode)
                && e.Timestamp >= start
                && e.Timestamp <= end).ToList();
        var cycleEvents = indianaEvents.Where(e =>
            new List<short>
            {
                    1,
                    4,
                    5,
                    6,
                    7,
                    8,
                    11
            }.Contains(e.EventCode)
            && e.Timestamp >= start
            && e.Timestamp <= end).ToList();
        var splitsEventCodes = new List<short>();
        for (short i = 130; i <= 149; i++)
            splitsEventCodes.Add(i);
        var splitsEvents = indianaEvents.Where(e =>
            splitsEventCodes.Contains(e.EventCode)
            && e.Timestamp >= start
            && e.Timestamp <= end).ToList();
        var terminationEvents = indianaEvents.Where(e =>
            new List<short>
            {
                    4,
                    5,
                    6,
                    7
            }.Contains(e.EventCode)
            && e.Timestamp >= start
            && e.Timestamp <= end).ToList();


        var aggregatedSplitMonitor = GetAggregatedSplitMonitor(input,
               cycleEvents,
               pedEvents,
               splitsEvents,
               terminationEvents,
               location);

        return aggregatedSplitMonitor;

        //foreach (var phaseWithIndianaEvents in groupedIndianaEvents)
        //{
        //    var phase = phaseWithIndianaEvents.Key;
        //    var phaseIndianaEvents = phaseWithIndianaEvents.Value.OrderBy(i => i.Timestamp).ToList();
        //    //This must go Event Code 1, 8, 11 also split out by phase numbers in Event Param

        //    // What is the time between 1 and 11
        //    //Count the phases (how many complete cycles of 1, 8, and 11)
        //    int cycleCount = 0;
        //    List<TimeSpan> durations = new List<TimeSpan>();

        //    for (int i = 0; i < phaseIndianaEvents.Count - 2; i++)
        //    {
        //        var first = phaseIndianaEvents[i];
        //        var second = phaseIndianaEvents[i + 1];
        //        var third = phaseIndianaEvents[i + 2];

        //        // Check for sequence 1 -> 8 -> 11
        //        if (first.EventCode == 1 &&
        //            second.EventCode == 8 &&
        //            third.EventCode == 11)
        //        {
        //            // Valid cycle found
        //            cycleCount++;

        //            TimeSpan timeBetween1And11 = third.Timestamp - first.Timestamp;
        //            durations.Add(timeBetween1And11);

        //            //Console.WriteLine($"  Cycle {cycleCount}: Time between EventCode 1 and 11 = {timeBetween1And11}");

        //            // Skip to next possible cycle (non-overlapping)
        //            i += 2;
        //        }
        //    }
        //    listPhaseInformation.Add(new PhaseSplitMonitorDto
        //    {
        //        PhaseNumber = phase,
        //        PhaseCount = cycleCount,
        //        Durations = durations
        //    });
        //}

        //var maxPhaseNumberCycles = listPhaseInformation.Max(i => i.PhaseCount);
        //foreach (var phase in listPhaseInformation)
        //{
        //    var durationsInSeconds = phase.Durations.Select(d => d.TotalSeconds).ToList();

        //    double eightyfifthPercentileSplit = 0; // or double.NaN or -1, depending on how you want to handle it
        //    if (durationsInSeconds.Count > 0)
        //    {
        //        eightyfifthPercentileSplit = AtspmMath.Percentile(durationsInSeconds, 85);
        //    }

        //    var skippedCount = maxPhaseNumberCycles - phase.PhaseCount;
        //    try
        //    {
        //        var splitMonitor = new PhaseSplitMonitorAggregationFinal
        //        {
        //            LocationIdentifier = location?.LocationIdentifier ?? "-1",
        //            BinStartTime = input.Item2.OrderBy(i => i.Timestamp).Select(j => j.Timestamp).FirstOrDefault(),
        //            PhaseNumber = phase.PhaseNumber,
        //            EightyFifthPercentileSplit = eightyfifthPercentileSplit,
        //            SkippedCount = skippedCount,
        //            PhaseCount = phase.PhaseCount,
        //            DurrationInSeconds = durationsInSeconds.Sum(),
        //            MaxCycles = maxPhaseNumberCycles,
        //            Start = input.Item2.OrderBy(i => i.Timestamp).Select(j => j.Timestamp).FirstOrDefault(),
        //            End = input.Item2.OrderByDescending(i => i.Timestamp).Select(j => j.Timestamp).FirstOrDefault()
        //        };
        //        phaseSplitMonitor.Add(splitMonitor);

        //    }
        //    catch (Exception ex)
        //    {
        //        // Handle any exceptions that may occur during the aggregation
        //        // For example, log the error or rethrow it
        //        Console.WriteLine($"Error processing phase {phase.PhaseNumber}: {ex.Message}");
        //    }
        //}

        //var enumerable = phaseSplitMonitor.AsEnumerable();
        //return enumerable;
    }

    private List<PhaseSplitMonitorAggregationFinal> GetAggregatedSplitMonitor(Tuple<Location, IEnumerable<IndianaEvent>, DateTime, DateTime> input, List<IndianaEvent> cycleEvents, List<IndianaEvent> pedEvents, List<IndianaEvent> splitsEvents, List<IndianaEvent> terminationEvents, Location location)
    {
        var listPhaseInformation = new List<PhaseSplitMonitorAggregationFinal>();


        var phaseCollection = analysisPhaseCollectionService.GetAnalysisPhaseCollectionData(
                location.LocationIdentifier,
                input.Item3,
                input.Item4,
                new List<IndianaEvent>(),
                cycleEvents,
                splitsEvents,
                pedEvents,
                terminationEvents,
                location,
                1
                );

        if (phaseCollection == null)
        {
            return null;
        }

        var highCycleCount = GetHighCycleCount(phaseCollection);

        foreach (var phase in phaseCollection.AnalysisPhases)
        {
            var phaseData = GetChartDataForPhase(input, phase, highCycleCount);
            listPhaseInformation.Add(phaseData);
        }

        return listPhaseInformation;
    }

    private PhaseSplitMonitorAggregationFinal GetChartDataForPhase(Tuple<Location, IEnumerable<IndianaEvent>, DateTime, DateTime> input, AnalysisPhaseData phase, int highCycleCount)
    {
        var cycles = phase.Cycles.Cycles.ToList();
        int skippedPhases = highCycleCount - cycles.Count();

        var aggregatedPhaseSplitMonitor = new PhaseSplitMonitorAggregationFinal();
        aggregatedPhaseSplitMonitor.LocationIdentifier = input.Item1.LocationIdentifier;
        aggregatedPhaseSplitMonitor.BinStartTime = input.Item3;
        aggregatedPhaseSplitMonitor.PhaseNumber = phase.PhaseNumber;
        aggregatedPhaseSplitMonitor.Start = input.Item3;
        aggregatedPhaseSplitMonitor.End = input.Item4;
        aggregatedPhaseSplitMonitor.MaxCycles = highCycleCount;
        aggregatedPhaseSplitMonitor.EightyFifthPercentileSplit = GetPercentSplit(highCycleCount, .85, cycles);
        aggregatedPhaseSplitMonitor.GapOuts = highCycleCount > 0 ? Convert.ToDouble(cycles.Count(c => c.TerminationEvent == 4)) / highCycleCount : 0;
        aggregatedPhaseSplitMonitor.MaxOuts = GetPercentMaxOuts(cycles, highCycleCount);
        aggregatedPhaseSplitMonitor.ForceOffs = GetPercentForceOffs(cycles, highCycleCount);
        aggregatedPhaseSplitMonitor.AverageSplits = cycles.Count > 0 ? Convert.ToDouble(cycles.Sum(c => c.Duration.TotalSeconds)) / cycles.Count : 0;
        aggregatedPhaseSplitMonitor.SkippedCount = skippedPhases;
        aggregatedPhaseSplitMonitor.PhaseCount = cycles.Count;
        aggregatedPhaseSplitMonitor.DurrationInSeconds = cycles.Sum(c => c.Duration.TotalSeconds);


        return aggregatedPhaseSplitMonitor;
    }

    public int GetHighCycleCount(AnalysisPhaseCollectionData phases)
    {
        //find all the phases cycles within the plan
        var HighCycleCount = 0;
        foreach (var phase in phases.AnalysisPhases)
        {
            var Cycles = from cycle in phase.Cycles.Cycles
                         select cycle;

            if (Cycles.Count() > HighCycleCount)
                HighCycleCount = Cycles.Count();
        }
        return HighCycleCount;
    }

    private double GetPercentSplit(double highCycleCount, double percentile, List<AnalysisPhaseCycle> cycles)
    {
        if (cycles.Count <= 2)
            return 0;
        var orderedCycles = cycles.OrderBy(c => c.Duration.TotalSeconds).ToList();

        var percentilIndex = percentile * orderedCycles.Count;
        if ((percentilIndex % 1).AreEqual(0))
        {
            return orderedCycles.ElementAt(Convert.ToInt16(percentilIndex) - 1).Duration
                .TotalSeconds;
        }
        else
        {
            var indexMod = percentilIndex % 1;
            //subtracting .5 leaves just the integer after the convert.
            //There was probably another way to do that, but this is easy.
            int indexInt = Convert.ToInt16(percentilIndex - .5);

            var step1 = orderedCycles.ElementAt(Convert.ToInt16(indexInt) - 1).Duration.TotalSeconds;
            var step2 = orderedCycles.ElementAt(Convert.ToInt16(indexInt)).Duration.TotalSeconds;
            var stepDiff = step2 - step1;
            var step3 = stepDiff * indexMod;
            return step1 + step3;
        }
    }

    private static double GetPercentForceOffs(List<AnalysisPhaseCycle> cycles, double highCycleCounts)
    {
        var test = Convert.ToDouble(cycles.Count(c => c.TerminationEvent == 6));
        return highCycleCounts > 0 ? Convert.ToDouble(cycles.Count(c => c.TerminationEvent == 6)) / highCycleCounts : 0;
    }

    private static double GetPercentMaxOuts(List<AnalysisPhaseCycle> cycles, double highCycleCount)
    {
        var test = Convert.ToDouble(cycles.Count(c => c.TerminationEvent == 5));
        return highCycleCount > 0 ? Convert.ToDouble(cycles.Count(c => c.TerminationEvent == 5)) / highCycleCount : 0;
    }

    internal class PhaseSplitMonitorDto
    {
        public int PhaseNumber { get; set; }
        public int PhaseCount { get; set; }
        public List<TimeSpan> Durations { get; set; }
    }

    internal class PhaseSplitMonitorAggregationFinal
    {
        public string LocationIdentifier { get; set; }
        public DateTime BinStartTime { get; set; }
        public DateTime Start { get; set; }
        public DateTime End { get; set; }
        public int PhaseNumber { get; set; }
        public double EightyFifthPercentileSplit { get; set; }
        public int SkippedCount { get; set; } //All the cycles subtracted from the cycles
        public int PhaseCount { get; set; }
        public double DurrationInSeconds { get; set; }
        public int MaxCycles { get; set; }
        public double MaxOuts { get; set; }
        public double GapOuts { get; set; }
        public double ForceOffs { get; set; }
        public double AverageSplits { get; set; }
    }
}
