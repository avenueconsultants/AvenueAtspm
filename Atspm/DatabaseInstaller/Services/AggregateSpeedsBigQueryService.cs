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
using Utah.Udot.Atspm;
using Utah.Udot.Atspm.Data.Models;
using Utah.Udot.Atspm.Data.Models.EventLogModels;
using Utah.Udot.Atspm.Repositories.ConfigurationRepositories;
using Utah.Udot.Atspm.Repositories.EventLogRepositories;



public class AggregateSpeedsToBigQueryService : IHostedService
{
    private readonly BigQueryClient _bigQueryClient;
    private readonly StorageClient _storageClient;
    private readonly ILogger<AggregateSpeedsToBigQueryService> _logger;
    private readonly ILocationRepository _locationRepository;
    private readonly IIndianaEventLogBQRepository _eventRepo;
    private readonly ISpeedEventLogBQRepository _speedRepo;
    private readonly TransferCommandConfiguration _config;
    private readonly string _bucket = "salt-lake-mobility-event-uploads";
    private readonly IServiceProvider _serviceProvider;
    private static readonly List<int> _cycleEventCodes = new() { 1, 8 };

    public AggregateSpeedsToBigQueryService(
        BigQueryClient bigQueryClient,
        ILogger<AggregateSpeedsToBigQueryService> logger,
        StorageClient storageClient,
        ILocationRepository locationRepository,
        IOptions<TransferCommandConfiguration> config,
        IIndianaEventLogBQRepository eventRepo,
        ISpeedEventLogBQRepository speedRepo,
        IServiceProvider serviceProvider)
    {
        _bigQueryClient = bigQueryClient;
        _storageClient = storageClient;
        _locationRepository = locationRepository;
        _logger = logger;
        _eventRepo = eventRepo;
        _speedRepo = speedRepo;
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
            var results = new ConcurrentBag<ApproachSpeedAggregationfinal>();
            var startOfDay = System.DateTime.SpecifyKind(day.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
            var endOfDay = startOfDay.AddDays(1);

            await Parallel.ForEachAsync(locations, async (locationId, _) =>
            {
                using var scope = _serviceProvider.CreateScope();

                var locationRepository = scope.ServiceProvider.GetRequiredService<ILocationRepository>();
                var eventRepo = scope.ServiceProvider.GetRequiredService<IIndianaEventLogBQRepository>();
                var speedRepo = scope.ServiceProvider.GetRequiredService<ISpeedEventLogBQRepository>();
                try
                {
                    var location = locationRepository.GetLatestVersionOfLocation(locationId, startOfDay);
                    var allEvents = _eventRepo.GetByLocationTimeAndEventCodes(locationId, startOfDay, endOfDay, _cycleEventCodes).ToList();
                    var allSpeedEvents = _speedRepo.GetByLocationAndTimeRange(locationId, startOfDay, endOfDay).ToList();

                    for (var binStart = startOfDay; binStart < endOfDay; binStart += TimeSpan.FromMinutes(15))
                    {
                        var binEnd = binStart.AddMinutes(15);
                        var binEvents = allEvents
                            .Where(e => e.Timestamp >= binStart && e.Timestamp <= binEnd)
                            .ToList();

                        var binSpeedEvents = allSpeedEvents
                            .Where(e => e.Timestamp >= binStart && e.Timestamp <= binEnd)
                            .ToList();

                        if (!binEvents.Any()) continue;
                        if (!binSpeedEvents.Any()) continue;

                        var nestedTuple = new Tuple<IEnumerable<IndianaEvent>, IEnumerable<SpeedEvent>>(binEvents, binSpeedEvents);
                        var tuple = new Tuple<Location, Tuple<IEnumerable<IndianaEvent>, IEnumerable<SpeedEvent>>>(location, nestedTuple);
                        var aggregatedEvents = SpeedAggregationCalculations(tuple);
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
                var fileName = $"speedsaggregations/all-{day:yyyyMMdd}-{Guid.NewGuid():N}.ndjson.gz";
                var tempPath = Path.Combine(Path.GetTempPath(), Path.GetFileName(fileName));
                await WriteToFileAsync(results.ToList(), tempPath);
                await UploadToGcsAsync(fileName, tempPath);
                await LoadToBigQueryAsync(fileName);
                File.Delete(tempPath);
            }
        }
    }

    private async Task WriteToFileAsync(List<ApproachSpeedAggregationfinal> records, string filePath)
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
                TableId = "SpeedsAggregations"
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
            new() { Name = "ApproachId", Type = "INTEGER", Mode = "REQUIRED" },
            new() { Name = "SpeedVolume", Type = "INTEGER", Mode = "REQUIRED" },
            new() { Name = "SummedSpeed", Type = "FLOAT", Mode = "REQUIRED" },
            new() { Name = "AverageSpeed", Type = "FLOAT", Mode = "REQUIRED" },
            new() { Name = "Speed85th", Type = "FLOAT", Mode = "REQUIRED" },
            new() { Name = "Speed15th", Type = "FLOAT", Mode = "REQUIRED" }
        }
    };

    private IEnumerable<ApproachSpeedAggregationfinal> SpeedAggregationCalculations(Tuple<Location, Tuple<IEnumerable<IndianaEvent>, IEnumerable<SpeedEvent>>> input)
    {
        var location = input.Item1;
        var approaches = location?.Approaches.ToList();
        var speedEvents = input.Item2.Item2;
        var indianaEvents = input.Item2.Item1;
        if (approaches == null || !approaches.Any())
        {
            return Enumerable.Empty<ApproachSpeedAggregationfinal>();
        }
        if (speedEvents == null || !speedEvents.Any())
        {
            return Enumerable.Empty<ApproachSpeedAggregationfinal>();
        }
        List<ApproachSpeedAggregationfinal> approachSpeeds = new List<ApproachSpeedAggregationfinal>();
        // For each approach go through each detector and pull out the speed logs
        foreach (var approach in approaches)
        {
            //var detectors = approach.Detectors;
            var detectors = approach.Detectors.Select(i => i.DectectorIdentifier.ToString()).ToList();
            var phaseNumber = approach.ProtectedPhaseNumber;
            var speedEventsInApproach = speedEvents
                .Where(speedEvent => detectors.Contains(speedEvent.DetectorId))
                .Select(speed => (double)speed.Mph)
                .ToList();

            var startTime = speedEvents.OrderBy(i => i.Timestamp).Select(j => j.Timestamp).FirstOrDefault();

            double totalMph = speedEvents
                .Where(speedEvent => detectors.Contains(speedEvent.DetectorId))
                .Sum(speed => (double)speed.Mph);

            if (speedEventsInApproach.Count == 0)
            {
                continue; // Skip if no speed events in this approach
            }
            var approachSpeed = new ApproachSpeedAggregationfinal
            {
                LocationIdentifier = location.LocationIdentifier,
                BinStartTime = startTime,
                ApproachId = approach.Id,
                SummedSpeed = totalMph,
                SpeedVolume = speedEventsInApproach.Count(),
                AverageSpeed = speedEventsInApproach.Count > 0 ? Math.Round(AtspmMath.GetAverage(speedEventsInApproach), 1) : 0,
                Speed85th = speedEventsInApproach.Count > 0 ? Math.Round(AtspmMath.Percentile(speedEventsInApproach, 85), 1) : 0,
                Speed15th = speedEventsInApproach.Count > 0 ? Math.Round(AtspmMath.Percentile(speedEventsInApproach, 15), 1) : 0
            };
            approachSpeeds.Add(approachSpeed);
        }

        var enumerable = approachSpeeds.AsEnumerable();
        return enumerable;
    }


    internal class ApproachSpeedAggregationfinal
    {
        public string LocationIdentifier { get; set; }
        public DateTime BinStartTime { get; set; }
        public int ApproachId { get; set; }

        public double SummedSpeed { get; set; }
        public int SpeedVolume { get; set; }
        public double AverageSpeed { get; set; }
        public double Speed85th { get; set; }
        public double Speed15th { get; set; }
    }
}