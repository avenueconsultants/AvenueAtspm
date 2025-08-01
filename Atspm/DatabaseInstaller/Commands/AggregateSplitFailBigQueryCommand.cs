using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.CommandLine;
using System.CommandLine.Hosting;
using System.CommandLine.NamingConventionBinder;

namespace DatabaseInstaller.Commands
{
    public class AggregateSplitFailBigQueryCommand : Command, ICommandOption<TransferCommandConfiguration>
    {
        public AggregateSplitFailBigQueryCommand() : base("aggregate-splitfail", "Aggregate split fail data")
        {
            AddOption(StartOption);
            AddOption(EndOption);
            AddOption(LocationsOption);
            AddOption(Threads);
        }

        public Option<DateTime> StartOption { get; } = new("--start", "Start date");
        public Option<DateTime> EndOption { get; } = new("--end", "End date");
        public Option<string> LocationsOption { get; } = new("--locations", "Comma-separated list of location identifiers") { IsRequired = false };
        public Option<int?> Threads { get; } = new("--threads", "Number of threads to use") { IsRequired = false };

        public ModelBinder<TransferCommandConfiguration> GetOptionsBinder()
        {
            var binder = new ModelBinder<TransferCommandConfiguration>();
            binder.BindMemberFromValue(c => c.Start, StartOption);
            binder.BindMemberFromValue(c => c.End, EndOption);
            binder.BindMemberFromValue(c => c.Locations, LocationsOption);
            binder.BindMemberFromValue(c => c.Threads, Threads);
            return binder;
        }

        public void BindCommandOptions(HostBuilderContext host, IServiceCollection services)
        {
            services.AddSingleton(GetOptionsBinder());
            services.AddOptions<TransferCommandConfiguration>().BindCommandLine();
            services.AddHostedService<AggregateSplitFailToBigQueryService>();
        }
    }
}
