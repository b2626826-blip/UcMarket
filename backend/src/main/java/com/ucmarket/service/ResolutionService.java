package com.ucmarket.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketResult;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.Position;
import com.ucmarket.entity.PositionStatus;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.PositionRepository;

@Service
public class ResolutionService {

	private final MarketRepository marketRepository;
	private final PositionRepository positionRepository;
	private final WalletService walletService;

	public ResolutionService(
			MarketRepository marketRepository,
			PositionRepository positionRepository,
			WalletService walletService
	) {
		this.marketRepository = marketRepository;
		this.positionRepository = positionRepository;
		this.walletService = walletService;
	}

	@Transactional
	public Market resolveMarket(UUID marketId, MarketResult result, UUID adminId) {
		Market market = marketRepository.findById(marketId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

		if (market.getStatus() == MarketStatus.RESOLVED) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Market is already resolved");
		}

		if (market.getStatus() != MarketStatus.ACTIVE && market.getStatus() != MarketStatus.CLOSED) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Market is not ready to resolve");
		}

		List<Position> positions = positionRepository.findByMarketIdAndStatus(marketId, PositionStatus.OPEN);

		for (Position position : positions) {
			BigDecimal payout = calculatePayout(position, result);

			if (payout.compareTo(BigDecimal.ZERO) > 0) {
				payWinner(position, marketId, payout);
			}

			position.settle();
		}

		market.resolve(result, adminId);

		return marketRepository.save(market);
	}

	private BigDecimal calculatePayout(Position position, MarketResult result) {
		if (result == MarketResult.YES) {
			return position.getYesShares();
		}

		return position.getNoShares();
	}

	private void payWinner(Position position, UUID marketId, BigDecimal payout) {
		String idempotencyKey = "resolution:" + marketId + ":" + position.getUserId();
		walletService.credit(position.getUserId(), payout, "MARKET", marketId, idempotencyKey);
	}
}
