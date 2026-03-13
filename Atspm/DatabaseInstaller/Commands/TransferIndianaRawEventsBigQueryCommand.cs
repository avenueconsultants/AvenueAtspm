using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.CommandLine;
using System.CommandLine.Hosting;
using System.CommandLine.NamingConventionBinder;
using DatabaseInstaller.Services;

namespace DatabaseInstaller.Commands
{
    public class TransferRawIndianaEventsToBigQueryCommand : Command, ICommandOption<TransferCommandConfiguration>
    {
        public TransferRawIndianaEventsToBigQueryCommand()
            : base("transfer-raw-bq", "Transfer uncompressed IndianaEvent logs to BigQuery")
        {
            AddOption(StartOption);
            AddOption(EndOption);
            AddOption(LocationsOption);
            AddOption(Threads);
            AddOption(BatchOption);
        }

        public Option<DateTime> StartOption { get; } = new("--start", "Start date");
        public Option<DateTime> EndOption { get; } = new("--end", "End date");
        public Option<string> LocationsOption { get; } = new("--locations", "Comma-separated list of location identifiers") { IsRequired = false };
        public Option<int?> Threads { get; } = new("--threads", "Number of threads to use") { IsRequired = false };
        public Option<int?> BatchOption { get; } = new("--batch", "Number of locations to process per batch") { IsRequired = false };

        public ModelBinder<TransferCommandConfiguration> GetOptionsBinder()
        {
            var binder = new ModelBinder<TransferCommandConfiguration>();
            binder.BindMemberFromValue(c => c.Start, StartOption);
            binder.BindMemberFromValue(c => c.End, EndOption);
            binder.BindMemberFromValue(c => c.Locations, LocationsOption);
            binder.BindMemberFromValue(c => c.Threads, Threads);
            binder.BindMemberFromValue(c => c.Batch, BatchOption);
            return binder;
        }

        public void BindCommandOptions(HostBuilderContext host, IServiceCollection services)
        {
            services.AddSingleton(GetOptionsBinder());
            services.AddOptions<TransferCommandConfiguration>().BindCommandLine();
            services.AddHostedService<TransferRawIndianaEventsToBigQueryService>();
        }
    }
}
