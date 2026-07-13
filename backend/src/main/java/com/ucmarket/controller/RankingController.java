package com.ucmarket.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ucmarket.dto.RankingAssetsResponse;
import com.ucmarket.dto.RankingProfitResponse;
import com.ucmarket.dto.RankingSnapshotResponse;
import com.ucmarket.dto.RankingWinRateResponse;
import com.ucmarket.service.RankingService;

@RestController
@RequestMapping("/api/rankings")
public class RankingController {

	private final RankingService rankingService;

	public RankingController(RankingService rankingService) {
		this.rankingService = rankingService;
	}

	// GET /api/rankings/profit
	// 依「已結算派彩總額－已結算持倉成本」計算已實現損益，並由高到低回傳排行榜。
	@GetMapping("/profit")
	public List<RankingProfitResponse> getProfitRankings() {
		return rankingService.getProfitRankings();
	}

	// GET /api/rankings/win-rate
	// 依已結算市場中的預測正確比例計算勝率，並由高到低回傳排行榜。
	@GetMapping("/win-rate")
	public List<RankingWinRateResponse> getWinRateRankings() {
		return rankingService.getWinRateRankings();
	}

	// GET /api/rankings/assets
	// 依「錢包餘額＋未結算持倉市值」計算總資產，並由高到低回傳排行榜。
	@GetMapping("/assets")
	public List<RankingAssetsResponse> getAssetRankings() {
	    return rankingService.getAssetRankings();
	}
	// GET /api/rankings?metric=profit|win-rate|assets
	// 以單一資料庫查詢取得所有欄位與排序，回傳同一時間點的快照。
	@GetMapping
	public RankingSnapshotResponse getRankingSnapshot(
			@RequestParam(defaultValue = "profit") String metric) {
		return rankingService.getRankingSnapshot(metric);
	}
}
