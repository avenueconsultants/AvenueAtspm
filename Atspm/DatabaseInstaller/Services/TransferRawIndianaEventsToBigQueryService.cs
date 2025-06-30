using DatabaseInstaller.Commands;
using Google.Cloud.BigQuery.V2;
using Google.Cloud.Storage.V1;
using Google.Apis.Bigquery.v2.Data;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using System.IO.Compression;
using Utah.Udot.Atspm.Data.Models.EventLogModels;
using Utah.Udot.Atspm.Repositories.ConfigurationRepositories;
using Utah.Udot.Atspm.Data.Models;

namespace DatabaseInstaller.Services;

public class TransferRawIndianaEventsToBigQueryService : TransferEventLogsToBigQueryBase<IndianaEventDto>
{
    private readonly string _table = "IndianaEventLogs";
    private readonly TransferCommandConfiguration _config;

    public TransferRawIndianaEventsToBigQueryService(
        ILogger<TransferRawIndianaEventsToBigQueryService> logger,
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
        { "EventCode", BigQueryDbType.Int64, BigQueryFieldMode.Required },
        { "EventParam", BigQueryDbType.Int64, BigQueryFieldMode.Required }
    }.Build();

    protected override async Task<List<IndianaEventDto>> GetEventsAsync(string locationId, DateTime day)
    {
        return await _retryPolicy.ExecuteAsync(async () =>
        {
            var events = new List<IndianaEventDto>();
            const string query = @"
                SELECT LogData FROM [dbo].[ControllerLogArchives]
                WHERE SignalId = @SignalId AND ArchiveDate = @Date";

            using var conn = new SqlConnection(_config.Source);
            await conn.OpenAsync();

            using var cmd = new SqlCommand(query, conn);
            cmd.Parameters.AddWithValue("@SignalId", locationId);
            cmd.Parameters.AddWithValue("@Date", day.Date);

            using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                byte[] compressed = (byte[])reader["LogData"];
                byte[] decompressed;

                using var input = new MemoryStream(compressed);
                using var gzip = new GZipStream(input, CompressionMode.Decompress);
                using var output = new MemoryStream();
                await gzip.CopyToAsync(output);

                decompressed = output.ToArray();
                string json = System.Text.Encoding.UTF8.GetString(decompressed);
                var rawEvents = JsonConvert.DeserializeObject<List<ControllerEventLog>>(json);

                events = rawEvents
                    .Select(e => new IndianaEventDto
                    {
                        LocationIdentifier = locationId,
                        Timestamp = e.Timestamp,
                        EventCode = e.EventCode,
                        EventParam = e.EventParam
                    }).ToList();
            }

            return events;
        });
    }
}
