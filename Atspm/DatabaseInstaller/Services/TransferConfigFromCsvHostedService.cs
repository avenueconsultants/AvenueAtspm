using CsvHelper;
using DatabaseInstaller.Commands;
using Google.Cloud.Storage.V1;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Globalization;
using Utah.Udot.Atspm.Data.Enums;
using Utah.Udot.Atspm.Data.Models;
using Utah.Udot.Atspm.Repositories.ConfigurationRepositories;

namespace DatabaseInstaller.Services
{
    public class TransferConfigFromCsvHostedService : IHostedService
    {
        private readonly ILocationRepository _locationRepository;
        private readonly IDetectionTypeRepository _detectionTypeRepository;
        private readonly ILogger<TransferConfigFromCsvHostedService> _logger;
        private readonly CopyFromCsvConfiguration _config;
        private readonly StorageClient _storageClient;


        public TransferConfigFromCsvHostedService(ILocationRepository locationRepository,
            IDetectionTypeRepository detectionTypeRepository,
            ILogger<TransferConfigFromCsvHostedService> logger,
            IOptions<CopyFromCsvConfiguration> config,
            StorageClient storageClient)
        {
            _locationRepository = locationRepository;
            _detectionTypeRepository = detectionTypeRepository;
            _logger = logger;
            _config = config.Value;
            _storageClient = StorageClient.Create();
        }

        public async Task StartAsync(CancellationToken cancellationToken)
        {
            var locationsMap = GetLocationsMappingFromCsv();
            foreach (var location in locationsMap)
            {
                await _locationRepository.AddAsync(location.Value);
            }
        }

        private Dictionary<int, Location> GetLocationsMappingFromCsv()
        {
            Dictionary<int, Location> locations = new Dictionary<int, Location>();
            using (var reader = new StreamReader(_config.LocationsFilePath))
            {
                using (var csv = new CsvReader(reader, CultureInfo.InvariantCulture))
                {
                    while (csv.Read())
                    {
                        var locationIdentifier = csv.GetField<string>(0) ?? string.Empty;
                        var primaryName = csv.GetField<string>(3) ?? string.Empty;
                        var secondaryName = csv.GetField<string>(4) ?? string.Empty;
                        var latitude = csv.TryGetField<double>(1, out var lat) ? lat : 0.0;
                        var longitude = csv.TryGetField<double>(2, out var lon) ? lon : 0.0;
                        var versionAction = csv.TryGetField<int>(12, out var action) ? (LocationVersionActions)action : LocationVersionActions.Unknown;
                        var start = csv.TryGetField<DateTime>(14, out var startDate) ? startDate : DateTime.MinValue;
                        var locationId = csv.TryGetField<int>(11, out var locId) ? locId : -1;

                        var location = new Location
                        {
                            LocationIdentifier = locationIdentifier,
                            PrimaryName = primaryName,
                            SecondaryName = secondaryName,
                            Latitude = latitude,
                            Longitude = longitude,
                            ChartEnabled = true,
                            VersionAction = versionAction,
                            Start = start,
                            RegionId = 1,
                            JurisdictionId = 1,
                            PedsAre1to1 = true,
                            LocationTypeId = 1,
                        };

                        var deviceConfigId = csv.TryGetField<int>(7, out var configId) ? configId : -1;
                        var device = new Device
                        {
                            DeviceConfigurationId = deviceConfigId,
                            DeviceIdentifier = locationIdentifier,
                            Notes = locationIdentifier,
                            DeviceStatus = DeviceStatus.Active,
                            DeviceType = DeviceTypes.SignalController,
                            Ipaddress = "127.0.0.1",
                            LoggingEnabled = true,
                        };

                        location.Devices.Add(device);
                        locations.Add(csv.GetField<int>(11), location);
                    }
                }
            }

            var approachesMap = GetApproachesMappingFromCsv(locations);
            var detectionTypeMap = GetDetectionTypesMappingFromCsv();
            GetDetectorsMappingFromCsv(approachesMap, detectionTypeMap);

            return locations;

        }

        private void GetDetectorsMappingFromCsv(Dictionary<int, Approach> approachesMap, List<Tuple<int, int>> detectionTypeMap)
        {
            var detectionTypes = _detectionTypeRepository.GetList().ToList();
            using (var reader = new StreamReader(_config.DetectorsFilePath))
            {
                using (var csv = new CsvReader(reader, CultureInfo.InvariantCulture))
                {
                    while (csv.Read())
                    {
                        var approachId = csv.TryGetField<int>(12, out var appId) ? appId : -1;
                        if (approachId == -1 || !approachesMap.ContainsKey(approachId))
                            continue;

                        var approach = approachesMap[approachId];
                        var detectorId = csv.TryGetField<int>(0, out var detId) ? detId : -1;
                        var detectionTypeIds = detectionTypeMap.Where(dt => dt.Item1 == detectorId).Select(dt => dt.Item2).ToList();
                        var detectionTypesForDetector = detectionTypes.Where(dt => detectionTypeIds.Contains((int)dt.Id)).ToList();

                        var detector = new Detector
                        {
                            DectectorIdentifier = csv.GetField<string>(1) ?? string.Empty,
                            DetectorChannel = csv.TryGetField<int>(2, out var channel) ? channel : 0,
                            DistanceFromStopBar = csv.TryGetField<int>(3, out var dist) ? (int?)dist : null,
                            MinSpeedFilter = csv.TryGetField<int>(4, out var minSpeed) ? (int?)minSpeed : null,
                            DateAdded = csv.TryGetField<DateTime>(5, out var dateAdded) ? dateAdded : DateTime.MinValue,
                            DateDisabled = csv.TryGetField<DateTime>(6, out var dateDisabled) ? (DateTime?)dateDisabled : null,
                            LaneNumber = csv.TryGetField<int>(7, out var laneNumber) ? (int?)laneNumber : null,
                            MovementType = csv.TryGetField<int>(8, out var movementType) ? (MovementTypes)movementType : MovementTypes.NA,
                            LaneType = csv.TryGetField<int>(9, out var laneType) ? (LaneTypes)laneType : LaneTypes.NA,
                            DecisionPoint = csv.TryGetField<int>(10, out var decisionPoint) ? (int?)decisionPoint : null,
                            MovementDelay = csv.TryGetField<int>(11, out var movementDelay) ? (int?)movementDelay : null,
                            LatencyCorrection = csv.TryGetField<int>(13, out var latencyCorrection) ? latencyCorrection : 0,
                            DetectionTypes = detectionTypesForDetector,
                        };

                        approach.Detectors.Add(detector);
                    }
                }
            }
        }

        private List<Tuple<int, int>> GetDetectionTypesMappingFromCsv()
        {
            var detectionTypes = new List<Tuple<int, int>>();
            using (var reader = new StreamReader(_config.DetectionTypeDetectorFilePath))
            {
                using (var csv = new CsvReader(reader, CultureInfo.InvariantCulture))
                {
                    while (csv.Read())
                    {
                        detectionTypes.Add(new Tuple<int, int>(csv.GetField<int>(0), csv.GetField<int>(1)));
                    }
                }
            }
            return detectionTypes;
        }

        private Dictionary<int, Approach> GetApproachesMappingFromCsv(Dictionary<int, Location> locations)
        {
            var approachesDictionary = new Dictionary<int, Approach>();

            using (var reader = new StreamReader(_config.ApproachesFilePath))
            {
                using (var csv = new CsvReader(reader, CultureInfo.InvariantCulture))
                {
                    while (csv.Read())
                    {
                        var locationId = csv.TryGetField<int>(8, out var locId) ? locId : -1;
                        var locationIdentifier = csv.GetField<string>(1) ?? string.Empty;
                        var directionTypeId = csv.TryGetField<int>(2, out var dirType) ? (DirectionTypes)dirType : DirectionTypes.NA;
                        var description = csv.GetField<string>(3) ?? string.Empty;
                        var mph = csv.TryGetField<int>(4, out var speed) ? speed : 0;
                        var protectedPhaseNumber = csv.TryGetField<int>(5, out var protPhase) ? protPhase : 0;
                        var isProtectedPhaseOverlap = csv.TryGetField<int>(6, out var protOverlap) && protOverlap != 0;
                        var permissivePhaseNumber = csv.TryGetField<int>(7, out var permPhase) ? permPhase : 0;
                        var isPermissivePhaseOverlap = csv.TryGetField<int>(9, out var permOverlap) && permOverlap != 0;
                        var approachId = csv.TryGetField<int>(0, out var appId) ? appId : -1;

                        if (locationId == -1 || appId == -1 || !locations.ContainsKey(locationId))
                            continue;

                        var location = locations[locationId];

                        var approach = new Approach
                        {
                            DirectionTypeId = directionTypeId,
                            Description = description,
                            Mph = mph,
                            ProtectedPhaseNumber = protectedPhaseNumber,
                            IsProtectedPhaseOverlap = isProtectedPhaseOverlap,
                            PermissivePhaseNumber = permissivePhaseNumber,
                            IsPermissivePhaseOverlap = isPermissivePhaseOverlap,
                        };
                        location.Approaches.Add(approach);
                        approachesDictionary.Add(approachId, approach);
                    }
                }
            }
            return approachesDictionary;
        }

        private async Task<string> DownloadFromGcsIfNeeded(string gcsPath)
        {
            if (!gcsPath.StartsWith("gs://"))
            {
                return gcsPath; // Local file, return as-is
            }

            // Parse bucket & object name from gs:// URL
            var uri = new Uri(gcsPath);
            string bucketName = uri.Host;
            string objectName = uri.AbsolutePath.TrimStart('/');

            // Define a local temp file path
            string localFilePath = Path.Combine("/tmp", Path.GetFileName(objectName));

            // Download file
            using (var outputFile = File.OpenWrite(localFilePath))
            {
                await _storageClient.DownloadObjectAsync(bucketName, objectName, outputFile);
            }

            return localFilePath;
        }

        public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
