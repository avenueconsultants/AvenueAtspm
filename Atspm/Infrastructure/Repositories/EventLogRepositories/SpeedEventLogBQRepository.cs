using Google.Cloud.BigQuery.V2;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Utah.Udot.Atspm.Data.Models.EventLogModels;
using Utah.Udot.Atspm.ValueObjects;

namespace Utah.Udot.Atspm.Infrastructure.Repositories.EventLogRepositories
{
    public class SpeedEventLogBQRepository : ISpeedEventLogBQRepository
    {
        private readonly BigQueryClient _client;
        private readonly string _projectId;
        private readonly string _datasetId;
        private readonly string _tableId = "SpeedEvents";
        private readonly ILogger<SpeedEventLogBQRepository> _logger;

        public SpeedEventLogBQRepository(BigQueryClient client, IOptions<BigQueryOptions> options, ILogger<SpeedEventLogBQRepository> logger)
        {
            _client = client;
            _projectId = options.Value.ProjectId;
            _datasetId = options.Value.DatasetId;
            _logger = logger;
        }

        public async Task AddAsync(SpeedEvent item)
        {
            var row = MapToRow(item);
            await _client.InsertRowAsync(_datasetId, _tableId, row);
        }

        public async Task AddRangeAsync(IEnumerable<SpeedEvent> items)
        {
            var rows = items.Select(MapToRow);
            await _client.InsertRowsAsync(_datasetId, _tableId, rows);
        }

        public IReadOnlyList<SpeedEvent> GetByLocationAndTimeRange(string locationIdentifier, DateTime start, DateTime end)
        {
            string sql = $@"
                SELECT LocationIdentifier, Timestamp, DetectorId, Mph, Kph
                FROM `{_projectId}.{_datasetId}.{_tableId}`
                WHERE LocationIdentifier = @loc
                  AND Timestamp BETWEEN CAST(@start AS DATETIME) AND CAST(@end AS DATETIME)";

            var results = _client.ExecuteQuery(sql, new[]
            {
                new BigQueryParameter("loc", BigQueryDbType.String, locationIdentifier),
                new BigQueryParameter("start", BigQueryDbType.Timestamp, start),
                new BigQueryParameter("end", BigQueryDbType.Timestamp, end)
            });

            return results.Select(r => new SpeedEvent
            {
                LocationIdentifier = (string)r["LocationIdentifier"],
                Timestamp = (DateTime)r["Timestamp"],
                DetectorId = (string)r["DetectorId"],
                Mph = Convert.ToInt32(r["Mph"]),
                Kph = Convert.ToInt32(r["Kph"])
            }).ToList();
        }

        public IReadOnlyList<SpeedEvent> GetByLocationsAndTimeRange(List<string> locationIds, DateTime start, DateTime end)
        {
            string sql = $@"
                SELECT LocationIdentifier, Timestamp, DetectorId, Mph, Kph
                FROM `{_projectId}.{_datasetId}.{_tableId}`
                WHERE Timestamp BETWEEN CAST(@start AS DATETIME) AND CAST(@end AS DATETIME)
                AND LocationIdentifier IN UNNEST(@locations)";

            var results = _client.ExecuteQuery(sql, new[]
            {
                new BigQueryParameter("locations", BigQueryDbType.Array, locationIds),
                new BigQueryParameter("start", BigQueryDbType.Timestamp, start),
                new BigQueryParameter("end", BigQueryDbType.Timestamp, end)
            });

            return results.Select(r => new SpeedEvent
            {
                LocationIdentifier = (string)r["LocationIdentifier"],
                Timestamp = (DateTime)r["Timestamp"],
                DetectorId = (string)r["DetectorId"],
                Mph = Convert.ToInt32(r["Mph"]),
                Kph = Convert.ToInt32(r["Kph"])
            }).ToList();
        }

        IReadOnlyList<IndianaEvent> IBigQueryRepository<SpeedEvent>.GetByLocationTimeAndEventCodes(string locationIdentifier, DateTime start, DateTime end, List<int> eventCodes)
        {
            throw new NotImplementedException();
        }

        private BigQueryInsertRow MapToRow(SpeedEvent e) => new()
        {
            { "LocationIdentifier", e.LocationIdentifier },
            { "Timestamp", e.Timestamp },
            { "DetectorId", e.DetectorId },
            { "Mph", e.Mph },
            { "Kph", e.Kph }
        };
    }
}
