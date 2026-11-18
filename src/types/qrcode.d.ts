declare module "qrcode" {
  type QRCodeOptions = {
    errorCorrectionLevel?: string;
    margin?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  };

  export function toDataURL(text: string, options?: QRCodeOptions): Promise<string>;

  const QRCode: {
    toDataURL: typeof toDataURL;
  };

  export default QRCode;
}
