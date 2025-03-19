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

                        var location = new Location
                        {
                            LocationIdentifier = csv.GetField<string>(0),
                            PrimaryName = csv.GetField<string>(3),
                            SecondaryName = csv.GetField<string>(4),
                            Latitude = csv.GetField<double>(1),
                            Longitude = csv.GetField<double>(2),
                            ChartEnabled = true,
                            VersionAction = (LocationVersionActions)csv.GetField<int>(12),
                            Start = csv.GetField<DateTime>(14),
                            RegionId = 1,
                            JurisdictionId = 1,
                            PedsAre1to1 = true,
                            LocationTypeId = 1,
                        };

                        var device = new Device
                        {
                            DeviceConfigurationId = csv.GetField<int>(7),
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
                        var approachId = csv.GetField<int>(12);
                        var approach = approachesMap[approachId];
                        var detectionTypeIds = detectionTypeMap.Where(dt => dt.Item1 == csv.GetField<int>(0)).Select(dt => dt.Item2).ToList();
                        var detectionTypesForDetector = detectionTypes.Where(dt => detectionTypeIds.Contains((int)dt.Id)).ToList();

                        var detector = new Detector
                        {
                            DectectorIdentifier = csv.GetField<string>(1),
                            DetectorChannel = csv.GetField<int>(2),
                            DistanceFromStopBar = csv.GetField<string>(3) == "NULL" ? null : csv.GetField<int>(3),
                            MinSpeedFilter = csv.GetField<string>(4) == "NULL" ? null : csv.GetField<int>(4),
                            DateAdded = csv.GetField<DateTime>(5),
                            DateDisabled = csv.GetField<string>(6) == "NULL" ? null : csv.GetField<DateTime>(6),
                            LaneNumber = csv.GetField<string>(7) == "NULL" ? null : csv.GetField<int>(7),
                            MovementType = csv.GetField<string>(8) == "NULL" ? MovementTypes.NA : (MovementTypes)csv.GetField<int>(8),
                            LaneType = csv.GetField<string>(9) == "NULL" ? LaneTypes.NA : (LaneTypes)csv.GetField<int>(9),
                            DecisionPoint = csv.GetField<string>(10) == "NULL" ? null : csv.GetField<int>(10),
                            MovementDelay = csv.GetField<string>(11) == "NULL" ? null : csv.GetField<int>(11),
                            LatencyCorrection = csv.GetField<int>(13),
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
                        var locationId = csv.GetField<int>(8);
                        var locationIdentifier = csv.GetField<string>(1);
                        var location = locations[locationId];

                        var approach = new Approach
                        {
                            DirectionTypeId = (DirectionTypes)csv.GetField<int>(2),
                            Description = csv.GetField<string>(3),
                            Mph = csv.GetField<int>(4),
                            ProtectedPhaseNumber = csv.GetField<int>(5),
                            IsProtectedPhaseOverlap = csv.GetField<int>(6) == 0 ? false : true,
                            PermissivePhaseNumber = csv.GetField<int>(7),
                            IsPermissivePhaseOverlap = csv.GetField<int>(9) == 0 ? false : true,
                        };
                        location.Approaches.Add(approach);
                        approachesDictionary.Add(csv.GetField<int>(0), approach);
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
