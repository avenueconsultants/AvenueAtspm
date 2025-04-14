namespace Utah.Udot.Atspm.Services
{
    public interface ICloudStorageService
    {
        Task<Stream> GetFileStreamAsync(string fileName);
    }
}
