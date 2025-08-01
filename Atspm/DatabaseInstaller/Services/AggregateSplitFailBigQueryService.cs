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
using Utah.Udot.Atspm.Data.Models;
using Utah.Udot.Atspm.Data.Models.EventLogModels;
using Utah.Udot.Atspm.Repositories.ConfigurationRepositories;
using Utah.Udot.Atspm.Repositories.EventLogRepositories;



public class AggregateSplitFailToBigQueryService : IHostedService
{
    private readonly BigQueryClient _bigQueryClient;
    private readonly StorageClient _storageClient;
    private readonly ILocationRepository _locationRepository;
    private readonly ILogger<AggregateSplitFailToBigQueryService> _logger;
    private readonly IIndianaEventLogBQRepository _eventRepo;
    private readonly TransferCommandConfiguration _config;
    private readonly string _bucket = "salt-lake-mobility-event-uploads";
    private readonly IServiceProvider _serviceProvider;
    private static readonly List<int> _cycleEventCodes = new() { 1, 8, 9, 81, 82 };

    public AggregateSplitFailToBigQueryService(
        BigQueryClient bigQueryClient,
        ILogger<AggregateSplitFailToBigQueryService> logger,
        StorageClient storageClient,
        ILocationRepository locationRepository,
        IOptions<TransferCommandConfiguration> config,
        IIndianaEventLogBQRepository eventRepo,
        IServiceProvider serviceProvider)
    {
        _bigQueryClient = bigQueryClient;
        _storageClient = storageClient;
        _locationRepository = locationRepository;
        _logger = logger;
        _eventRepo = eventRepo;
        _config = config.Value;
        _serviceProvider = serviceProvider; // 👈 save it

    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var stringLocations = "2335,1109,1019,1094,1151,1096,1097,7124,1169,7252,1026,1067,1076,1162,1103,1065,1066,1068,1069,1070,1071,1072,1073,1074,1075,1077,1078,1079,1080,1081,1082,1083,1085,1086,1087,1088,1089,1090,1091,1093,1095,1098,1099,1100,1101,1102,1104,1105,1106,1107,1110,1111,1112,1116,1117,1118,1119,1120,1121,1124,1125,1127,1128,1129,1131,1132,1133,1134,1135,1136,1138,1139,1141,1142,1153,1223,1224,1225,1226,1227,1228,1229,1801,7216,7217,7218,7219,7220,7222,7223,7241,7251,7366,7367,7368,7369,7370,7371,7372,7474,7503,7642,1032,1033,1034,1035,1037,1046,1047,1048,1049,1051,1052,1053,1054,1055,1058,1059,1060,1061,1062,1063,1163,1164,1165,1166,1202,1221,1222,1013,1017,1018,1020,1021,1022,1024,1025,1029,1031,7069,7122,7123,7125,7127,7128,7130,7132,7133,7135,7136,7137,7138,7139,7140,7141,7143,7144,7145,7146,7147,7148,7149,7150,7151,7254,7270,7274,7342,7619,1084,7221,7475,7633,7647,1056,1057,7129,7618,1146,1147,1148,1149,1150,1157,7224,7242,7243,7244,7245,7246,7247,7248,7249,7250,7635,1036,1038,1039,1040,1041,1042,1043,1044,1045,1168,1177,1178,1203,1205,1208,1220,1014,1015,1016,1023,1027,1028,1030,7126,7131,7134,7142,7180,7181,7182,7183,7184,7185,7186,7187,7253,7255,7271,7272,7273,1825,1826,1827,1155,1803,1805,1806,1807,1809,1810,1812,1154,1802,1804,1820,1172,1064,1822,7648,1204,7494,7466,7495,7444\r\n ";
        var locations = stringLocations.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(s => s.Trim()).ToList();

        for (var day = DateOnly.FromDateTime(_config.Start); day <= DateOnly.FromDateTime(_config.End); day = day.AddDays(1))
        {
            _logger.LogInformation("Processing date {Date}", day);
            var results = new ConcurrentBag<ApproachSplitFailAggregationFinal>();
            var startOfDay = System.DateTime.SpecifyKind(day.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
            var endOfDay = startOfDay.AddDays(1);

            await Parallel.ForEachAsync(locations, async (locationId, _) =>
            {
                using var scope = _serviceProvider.CreateScope();

                var locationRepository = scope.ServiceProvider.GetRequiredService<ILocationRepository>();
                var eventRepo = scope.ServiceProvider.GetRequiredService<IIndianaEventLogBQRepository>();

                try
                {
                    var location = locationRepository.GetLatestVersionOfLocation(locationId, startOfDay);
                    var allEvents2 = eventRepo.GetByLocationAndTimeRange(locationId, startOfDay, endOfDay).ToList();
                    var allEvents = _eventRepo.GetByLocationTimeAndEventCodes(locationId, startOfDay, endOfDay, _cycleEventCodes).ToList();

                    for (var binStart = startOfDay; binStart < endOfDay; binStart += TimeSpan.FromMinutes(15))
                    {
                        var binEnd = binStart.AddMinutes(15);
                        var binEvents = allEvents
                            .Where(e => e.Timestamp >= binStart && e.Timestamp <= binEnd)
                            .ToList();

                        if (!binEvents.Any()) continue;

                        var tuple = new Tuple<Location, IEnumerable<IndianaEvent>>(location, binEvents);
                        var aggregatedEvents = SplitFailureAggregationCalculation(tuple);
                        if (aggregatedEvents == null || !aggregatedEvents.Any()) continue;
                        foreach (var result in aggregatedEvents)
                        {
                            if (result == null) continue;
                            result.BinStartTime = binStart;
                            result.LocationIdentifier = locationId;
                            //result.LocationIdentifier = location.LocationIdentifier;
                            results.Add(result);
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
                var fileName = $"splitFailAggregations/all-{day:yyyyMMdd}-{Guid.NewGuid():N}.ndjson.gz";
                var tempPath = Path.Combine(Path.GetTempPath(), Path.GetFileName(fileName));
                await WriteToFileAsync(results.ToList(), tempPath);
                await UploadToGcsAsync(fileName, tempPath);
                await LoadToBigQueryAsync(fileName);
                File.Delete(tempPath);
            }
        }
    }

    private async Task WriteToFileAsync(List<ApproachSplitFailAggregationFinal> records, string filePath)
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
                TableId = "SplitFailureAggregations"
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
            new() { Name = "ApproachId", Type = "INTEGER", Mode = "REQUIRED" },
            new() { Name = "IsProtectedPhase", Type = "BOOLEAN", Mode = "REQUIRED" },
            new() { Name = "SplitFailures", Type = "INTEGER", Mode = "REQUIRED" },
            new() { Name = "GreenOccupancySum", Type = "INTEGER", Mode = "REQUIRED" },
            new() { Name = "RedOccupancySum", Type = "INTEGER", Mode = "REQUIRED" },
            new() { Name = "GreenTimeSum", Type = "INTEGER", Mode = "REQUIRED" },
            new() { Name = "RedTimeSum", Type = "INTEGER", Mode = "REQUIRED" },
            new() { Name = "Cycles", Type = "INTEGER", Mode = "REQUIRED" }
        }
    };


    private IEnumerable<ApproachSplitFailAggregationFinal> SplitFailureAggregationCalculation(Tuple<Location, IEnumerable<IndianaEvent>> input)
    {
        var phaseSplitMonitor = new List<ApproachSplitFailAggregationFinal>();
        var location = input.Item1;
        var approaches = location?.Approaches;
        if (approaches == null || approaches.Count <= 0)
        {
            return null; // No approaches, return empty list
        }
        var indianaEvents = input.Item2;
        var detectionEvents = indianaEvents
            .Where(i => i.EventCode == 81 || i.EventCode == 82)
            .ToList();
        var groupedIndianaEvents = indianaEvents
            .Where(i => i.EventCode == 1 || i.EventCode == 8 || i.EventCode == 9)
            .GroupBy(i => i.EventParam)
            .ToDictionary(g => g.Key, g => g.ToList());

        var listPhaseInformation = new List<PhaseSplitFailDto>();
        foreach (var phaseWithIndianaEvents in groupedIndianaEvents)
        {
            var phase = phaseWithIndianaEvents.Key;
            var phaseIndianaEvents = phaseWithIndianaEvents.Value.OrderBy(i => i.Timestamp).ToList();
            int cycleCount = 0;
            List<Tuple<DateTime, DateTime>> greenTimes = new List<Tuple<DateTime, DateTime>>();
            List<Tuple<DateTime, DateTime>> redTimes = new List<Tuple<DateTime, DateTime>>();
            int greenTimeSum = 0;

            for (int i = 0; i < phaseIndianaEvents.Count - 2; i++)
            {
                var first = phaseIndianaEvents[i];
                var second = phaseIndianaEvents[i + 1];
                var third = phaseIndianaEvents[i + 2];

                // Check for sequence 1 -> 8 -> 9
                if (first.EventCode == 1 &&
                    second.EventCode == 8 &&
                    third.EventCode == 9)
                {
                    // Valid cycle found
                    cycleCount++;
                    var greentime = new Tuple<DateTime, DateTime>(first.Timestamp, second.Timestamp);
                    var redtime = new Tuple<DateTime, DateTime>(third.Timestamp.AddSeconds(5), third.Timestamp.AddSeconds(10));
                    greenTimes.Add(greentime);
                    redTimes.Add(redtime);
                    greenTimeSum += (int)(second.Timestamp - first.Timestamp).TotalSeconds;

                    // Skip to next possible cycle (non-overlapping)
                    i += 2;
                }
            }

            listPhaseInformation.Add(new PhaseSplitFailDto
            {
                PhaseNumber = phase,
                GreenTime = greenTimes,
                RedTime = redTimes,
                GreenTimeSum = greenTimeSum,
                RedTimeSum = cycleCount * 5, // always 5 times the amount of cycles (only looking at 5 seconds after EC 9)
                Cycles = cycleCount
            });
        }

        List<ApproachSplitFailAggregationFinal> approachSplitFailure = new List<ApproachSplitFailAggregationFinal>();

        // For each approach go through each detector and pull out the speed logs
        foreach (var approach in approaches)
        {
            var protectedPhaseNumber = approach.ProtectedPhaseNumber;
            var permissivePhaseNumber = approach.ProtectedPhaseNumber;
            var detectors = approach.Detectors.Select(i => i.DetectorChannel).ToList();
            var detectionEventsInApproach = detectionEvents.Where(detEvent => detectors.Contains(detEvent.EventParam)).ToList();

            if (protectedPhaseNumber != 0 && protectedPhaseNumber != null)
            {
                ApproachSplitFailAggregationFinal splitFailProtected = SplitFailHelper(input, location, listPhaseInformation, approach, protectedPhaseNumber, detectionEventsInApproach, true);

                approachSplitFailure.Add(splitFailProtected);
            }
            if (permissivePhaseNumber != 0 && permissivePhaseNumber != null)
            {
                ApproachSplitFailAggregationFinal splitFailPermissive = SplitFailHelper(input, location, listPhaseInformation, approach, permissivePhaseNumber, detectionEventsInApproach, false);

                approachSplitFailure.Add(splitFailPermissive);
            }
        }

        var enumerable = approachSplitFailure.AsEnumerable();
        return enumerable;
    }

    private static ApproachSplitFailAggregationFinal SplitFailHelper(Tuple<Location, IEnumerable<IndianaEvent>> input, Location location, List<PhaseSplitFailDto> listPhaseInformation, Approach approach, int phaseNumber, List<IndianaEvent> detectionEventsInApproach, bool IsProtected)
    {
        var phaseInfo = listPhaseInformation
                                .Where(i => i.PhaseNumber == phaseNumber)
                                .FirstOrDefault();
        var greenOccupancySum = 0;
        var redOccupancySum = 0;
        var splitFailures = 0;
        if (phaseInfo == null)
        {
            return null;
        }
        for (int i = 0; i < phaseInfo.GreenTime.Count - 1; i++)
        {
            var greenTime = phaseInfo.GreenTime[i];
            var greenTimeStart = greenTime.Item1;
            var greenTimeEnd = greenTime.Item2;
            var greenDuration = (int)(greenTimeEnd - greenTimeStart).TotalSeconds;

            var redTime = phaseInfo.RedTime[i];
            var redTimeStart = redTime.Item1;
            var redTimeEnd = redTime.Item2;
            var redDuration = (int)(redTimeEnd - redTimeStart).TotalSeconds;

            var greenOccupancyEvents = detectionEventsInApproach.Where(i => i.Timestamp >= greenTimeStart && i.Timestamp <= greenTimeEnd).ToList();
            var redOccupancyEvents = detectionEventsInApproach.Where(i => i.Timestamp >= redTimeStart && i.Timestamp <= redTimeEnd).ToList();

            bool eightyFivePercentGreen = false;
            bool eightyFivePercentRed = false;

            var startTime = greenTimeStart;
            foreach (var greenEvent in greenOccupancyEvents)
            {
                if (greenEvent.EventCode == 82) // Detector On
                {
                    startTime = greenEvent.Timestamp;
                }
                else if (greenEvent.EventCode == 81) // Detector Off
                {
                    var duration = (int)(greenEvent.Timestamp - startTime).TotalSeconds;
                    greenOccupancySum += duration;

                    if (duration >= greenDuration * 0.85)
                    {
                        eightyFivePercentGreen = true;
                    }
                }
            }
            startTime = greenTimeStart;
            foreach (var redEvent in redOccupancyEvents)
            {
                if (redEvent.EventCode == 82) // Detector On
                {
                    startTime = redEvent.Timestamp;
                }
                else if (redEvent.EventCode == 81) // Detector Off
                {
                    var duration = (int)(redEvent.Timestamp - startTime).TotalSeconds;
                    redOccupancySum += duration;

                    if (duration >= redDuration * 0.85)
                    {
                        eightyFivePercentRed = true;
                    }
                }
            }

            if (eightyFivePercentGreen && eightyFivePercentRed)
            {
                splitFailures++;
            }
        }

        var splitFailProtected = new ApproachSplitFailAggregationFinal
        {
            LocationIdentifier = location.LocationIdentifier,
            BinStartTime = input.Item2.OrderBy(i => i.Timestamp).Select(j => j.Timestamp).FirstOrDefault(),
            PhaseNumber = phaseNumber,
            IsProtectedPhase = IsProtected,
            ApproachId = approach.Id,
            SplitFailures = splitFailures, // how many times the 85% was hit for both green and red
            GreenOccupancySum = greenOccupancySum, //how long the detector was on (EC 81on, 82 off)
            RedOccupancySum = redOccupancySum, // how long the detector was on those 5 sec. (after 9)
            GreenTimeSum = phaseInfo.GreenTimeSum,
            RedTimeSum = phaseInfo.RedTimeSum,
            Cycles = phaseInfo.Cycles
        };
        return splitFailProtected;
    }

    internal class PhaseSplitFailDto
    {
        public int PhaseNumber { get; set; }
        public List<Tuple<DateTime, DateTime>> GreenTime { get; set; } // start time of the green phase
        public List<Tuple<DateTime, DateTime>> RedTime { get; set; } // start time of the red phase
        public int GreenTimeSum { get; set; } //how long the light was green (EC 1 - 8)
        public int RedTimeSum { get; set; } // always 5 times the amount of cycles (only looking at 5 seconds after EC 9)
        public int Cycles { get; set; } //(1 , 8, 9)
    }

    internal class ApproachSplitFailAggregationFinal
    {
        public string LocationIdentifier { get; set; }
        public DateTime BinStartTime { get; set; }
        public int PhaseNumber { get; set; }

        ///<inheritdoc/>
        public int ApproachId { get; set; }

        public bool IsProtectedPhase { get; set; } // not zero get the calculations for each version protected phase and not :P use this as the event param
        public int SplitFailures { get; set; } // how many times the 85% was hit for both green and red
        public int GreenOccupancySum { get; set; } //how long the detector was on (EC 81on, 82 off)
        public int RedOccupancySum { get; set; } // how long the detector was on those 5 sec. (after 9)
        public int GreenTimeSum { get; set; } //how long the light was green (EC 1 - 8)
        public int RedTimeSum { get; set; } // always 5 times the amount of cycles (only looking at 5 seconds after EC 9)
        public int Cycles { get; set; } //(1 , 8, 9)
    }

}
