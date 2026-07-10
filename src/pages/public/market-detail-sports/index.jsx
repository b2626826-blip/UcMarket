import { useParams } from 'react-router-dom';
import DetailPageTemplate from '../../../components/common/DetailPageTemplate';

export default function SportsDetailPage() {
  const { id } = useParams();

  return (
    <DetailPageTemplate
      id={id}
      subtitle="運動賽事預測市場"
      marketId={id}
    >
      <div className="trade-market-card">
        {/* 運動類別內容：在上面加入自訂的 Market Info Card（badge、標題、YES/NO 價格、選項、meta）與圖表（隊伍勝率雷達圖、球員數據對比、即時比分板、賽程時間軸） */}
      </div>
    </DetailPageTemplate>
  );
}
