import { SAMPLE_XMLS } from './sampleData';

interface Props {
  onUpload: (file: File) => void;
  disabled?: boolean;
}

function toFile(xml: string, fileName: string): File {
  return new File([xml], fileName, { type: 'application/xml' });
}

function download(xml: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** 데모 모드 전용: 샘플 XML 세금계산서를 바로 올려 보거나 내려받아 직접 끌어다 놓을 수 있게 한다. */
export default function SampleXmlButtons({ onUpload, disabled }: Props): JSX.Element {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <span className="text-gray-500">XML 파일이 없다면 샘플로 해 보기:</span>
      {SAMPLE_XMLS.map((sample) => (
        <span key={sample.key} className="inline-flex items-center gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onUpload(toFile(sample.build(), sample.fileName))}
            className="px-3 py-1.5 rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {sample.label} 올리기
          </button>
          <button
            type="button"
            onClick={() => download(sample.build(), sample.fileName)}
            className="px-2 py-1.5 text-gray-500 hover:text-gray-800 underline"
          >
            내려받기
          </button>
        </span>
      ))}
    </div>
  );
}
