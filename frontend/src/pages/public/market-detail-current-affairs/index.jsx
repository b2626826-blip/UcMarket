import { useParams } from 'react-router-dom';
import DetailPageTemplate from '../../../components/common/DetailPageTemplate';

export default function CurrentAffairsDetailPage() {
  const { id } = useParams();

  return (
    <DetailPageTemplate
      id={id}
      subtitle="時事事件預測市場"
      marketId={id}
    >
      <div className="trade-market-card">
        {/* 時事類別內容：在上面加入自訂的 Market Info Card（badge、標題、YES/NO 價格、選項、meta）與圖表（話題熱度趨勢圖、新聞事件時間軸、社群聲量長條圖、相關議題關聯圖） */}
      </div>
    </DetailPageTemplate>
  );
}
