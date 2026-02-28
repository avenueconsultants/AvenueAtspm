using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.CommandLine;
using System.CommandLine.Hosting;
using System.CommandLine.NamingConventionBinder;
using DatabaseInstaller.Services;

namespace DatabaseInstaller.Commands
{
    public class TransferCompressedIndianaEventsToBigQueryCommand : Command, ICommandOption<TransferCommandConfiguration>
    {
        public TransferCompressedIndianaEventsToBigQueryCommand()
            : base("transfer-compressed-bq", "Transfer IndianaEvent logs to BigQuery")
        {
            AddOption(StartOption);
            AddOption(EndOption);
            AddOption(LocationsOption);
            AddOption(Threads);
            AddOption(StorageFormatOption);
            AddOption(CredentialsFileOption);
        }

        public Option<DateTime> StartOption { get; } = new("--start", "Start date");
        public Option<DateTime> EndOption { get; } = new("--end", "End date");
        public Option<string> LocationsOption { get; } = new("--locations", "Comma-separated list of location identifiers") { IsRequired = false };
        public Option<int?> Threads { get; } = new("--threads", "Number of threads to use") { IsRequired = false };
        public Option<string> StorageFormatOption { get; } = new("--storage-format", () => "translate-events",
            "Storage format: transfer-events | translate-events | uncompressed");
        public Option<string> CredentialsFileOption { get; } = new("--credentials-file",
            "Path to Google service-account JSON file. When provided, project id is read from the file if not set elsewhere.")
        { IsRequired = false };

        public ModelBinder<TransferCommandConfiguration> GetOptionsBinder()
        {
            var binder = new ModelBinder<TransferCommandConfiguration>();
            binder.BindMemberFromValue(c => c.Start, StartOption);
            binder.BindMemberFromValue(c => c.End, EndOption);
            binder.BindMemberFromValue(c => c.Locations, LocationsOption);
            binder.BindMemberFromValue(c => c.Threads, Threads);
            binder.BindMemberFromValue(c => c.StorageFormat, StorageFormatOption);
            binder.BindMemberFromValue(c => c.CredentialsFile, CredentialsFileOption);
            return binder;
        }

        public void BindCommandOptions(HostBuilderContext host, IServiceCollection services)
        {
            services.AddSingleton(GetOptionsBinder());
            services.AddOptions<TransferCommandConfiguration>().BindCommandLine();
            services.AddHostedService<TransferCompressedIndianaEventsToBigQueryService>();
        }
    }
}
