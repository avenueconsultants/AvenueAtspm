
using DatabaseInstaller.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.CommandLine;
using System.CommandLine.Hosting;
using System.CommandLine.NamingConventionBinder;
using System.Threading;

namespace DatabaseInstaller.Commands
{
    public class TransferSpeedEventsToBigQueryCommand : Command, ICommandOption<TransferCommandConfiguration>
    {
        public TransferSpeedEventsToBigQueryCommand()
            : base("transfer-speed-bq", "Transfer speed events from SQL Server to BigQuery")
        {
            AddOption(SourceOption);
            AddOption(StartOption);
            AddOption(EndOption);
            AddOption(Threads);
            AddOption(LocationsOption);
        }

        public Option<string> SourceOption { get; set; } = new("--source", "SQL Server connection string");
        public Option<DateTime> StartOption { get; set; } = new("--start", "Start date");
        public Option<DateTime> EndOption { get; set; } = new("--end", "End date");
        public Option<int?> Threads { get; } = new("--threads", "Number of threads to use") { IsRequired = false };
        public Option<string> LocationsOption { get; } = new("--locations", "Comma-separated list of location identifiers") { IsRequired = false };

        public ModelBinder<TransferCommandConfiguration> GetOptionsBinder()
        {
            var binder = new ModelBinder<TransferCommandConfiguration>();
            binder.BindMemberFromValue(c => c.Source, SourceOption);
            binder.BindMemberFromValue(c => c.Start, StartOption);
            binder.BindMemberFromValue(c => c.End, EndOption);
            binder.BindMemberFromValue(c => c.Threads, Threads);
            binder.BindMemberFromValue(c => c.Locations, LocationsOption);
            return binder;
        }

        public void BindCommandOptions(HostBuilderContext host, IServiceCollection services)
        {
            services.AddSingleton(GetOptionsBinder());
            services.AddOptions<TransferCommandConfiguration>().BindCommandLine();
            services.AddHostedService<TransferSpeedEventsToBigQueryService>();
        }
    }
}
