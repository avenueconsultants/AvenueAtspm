using Utah.Udot.Atspm.Data.Models.EventLogModels;

namespace Utah.Udot.Atspm.Infrastructure.Services.EventLogDecoders
{
    public class GoogleLogToIndianaDecoder : EventLogDecoderBase<IndianaEvent>
    {

        public override IEnumerable<IndianaEvent> Decode(Device device, Stream stream, CancellationToken cancelToken = default)
        {
            cancelToken.ThrowIfCancellationRequested();

            if (stream == null || stream.Length == 0)
                throw new InvalidDataException("Stream is empty");

            stream.Position = 0;

            using var reader = new StreamReader(stream);

            while (!reader.EndOfStream)
            {
                cancelToken.ThrowIfCancellationRequested();

                var line = reader.ReadLine();
                if (string.IsNullOrWhiteSpace(line))
                    continue;

                var parts = line.Split(',');

                if (parts.Length < 4)
                    continue;

                var locationIdentifier = parts[0].Trim();
                var timestampStr = parts[1].Trim();
                Int16.TryParse(parts[2].Trim(), out short eventCode);
                Int16.TryParse(parts[3].Trim(), out short eventParam);

                if (!DateTime.TryParse(timestampStr, out var timestamp))
                    continue;

                yield return new IndianaEvent
                {
                    LocationIdentifier = locationIdentifier,
                    Timestamp = timestamp,
                    EventCode = eventCode,
                    EventParam = eventParam
                };
            }
        }

        public override bool IsCompressed(Stream stream)
        {
            return false;
        }
    }
}
