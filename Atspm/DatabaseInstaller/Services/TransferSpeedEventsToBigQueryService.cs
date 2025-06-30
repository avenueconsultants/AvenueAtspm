using DatabaseInstaller.Commands;
using Google.Cloud.BigQuery.V2;
using Google.Cloud.Storage.V1;
using Google.Apis.Bigquery.v2.Data;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Polly;
using Utah.Udot.Atspm.Data.Models.EventLogModels;
using Utah.Udot.Atspm.Repositories.ConfigurationRepositories;

namespace DatabaseInstaller.Services;

public class TransferSpeedEventsToBigQueryService : TransferEventLogsToBigQueryBase<SpeedEvent>
{
    private readonly string _table = "SpeedEvents";
    private readonly TransferCommandConfiguration _config;

    public TransferSpeedEventsToBigQueryService(
        ILogger<TransferSpeedEventsToBigQueryService> logger,
        ILocationRepository locationRepository,
        IOptions<TransferCommandConfiguration> config,
        BigQueryClient client,
        StorageClient storageClient)
        : base(client, storageClient, logger, locationRepository, config)
    {
        _config = config.Value;
    }

    protected override string TableName => _table;

    protected override TableSchema GetSchema() => new TableSchemaBuilder
    {
        { "LocationIdentifier", BigQueryDbType.String, BigQueryFieldMode.Required },
        { "Timestamp", BigQueryDbType.DateTime, BigQueryFieldMode.Required },
        { "DetectorId", BigQueryDbType.String, BigQueryFieldMode.Required },
        { "Mph", BigQueryDbType.Int64, BigQueryFieldMode.Required },
        { "Kph", BigQueryDbType.Int64, BigQueryFieldMode.Required }
    }.Build();

    protected override async Task<List<SpeedEvent>> GetEventsAsync(string locationId, DateTime day)
    {
        return await _retryPolicy.ExecuteAsync(async () =>
        {
            var speedEvents = new List<SpeedEvent>();

            const string query = @"
                SELECT DISTINCT DetectorID, MPH, KPH, Timestamp
                FROM MOE.dbo.Speed_Events
                WHERE Timestamp >= @startUtc AND Timestamp < @endUtc
                  AND DetectorID LIKE @detectorPrefix";

            using var conn = new SqlConnection(_config.Source);
            await conn.OpenAsync();

            using var cmd = new SqlCommand(query, conn);
            cmd.Parameters.AddWithValue("@startUtc", day);
            cmd.Parameters.AddWithValue("@endUtc", day.AddDays(1));
            cmd.Parameters.AddWithValue("@detectorPrefix", locationId + "%");
            cmd.CommandTimeout = 120;

            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                speedEvents.Add(new SpeedEvent
                {
                    DetectorId = reader.GetString(reader.GetOrdinal("DetectorID")),
                    Mph = reader.GetInt32(reader.GetOrdinal("MPH")),
                    Kph = reader.GetInt32(reader.GetOrdinal("KPH")),
                    Timestamp = reader.GetDateTime(reader.GetOrdinal("Timestamp")),
                    LocationIdentifier = locationId
                });
            }

            return speedEvents;
        });
    }
}
