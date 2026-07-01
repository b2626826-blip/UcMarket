import { useParams } from 'react-router-dom';
import DetailPageTemplate from '../../../components/common/DetailPageTemplate';

export default function PoliticsDetailPage() {
  const { id } = useParams();

  return (
    <DetailPageTemplate
      id={id}
      subtitle="政治事件預測市場"
      marketId={id}
    >
      <div className="trade-market-card">
        {/* 政治類別內容：在上面加入自訂的 Market Info Card（badge、標題、YES/NO 價格、選項、meta）與圖表（候選人民調折線圖、各地區選情長條圖、投票率預測、勝率堆疊圖） */}
      </div>
    </DetailPageTemplate>
  );
}
