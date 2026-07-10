import { useParams } from 'react-router-dom';
import DetailPageTemplate from '../../../components/common/DetailPageTemplate';

export default function FinanceDetailPage() {
  const { id } = useParams();

  return (
    <DetailPageTemplate
      id={id}
      subtitle="金融事件預測市場"
      marketId={id}
    >
      <div className="trade-market-card">
        {/* 金融類別內容：在上面加入自訂的 Market Info Card（badge、標題、YES/NO 價格、選項、meta）與圖表（價格走勢K線圖、成交量長條圖、多資產對比折線圖、市場情緒指標） */}
      </div>
    </DetailPageTemplate>
  );
}
