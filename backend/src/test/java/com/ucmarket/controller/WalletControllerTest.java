package com.ucmarket.controller;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import com.ucmarket.entity.User;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.security.JwtTokenProvider;
import com.ucmarket.service.WalletService;

/**
 * WalletController「網頁層」測試 —— @WebMvcTest 只載 controller，不連 DB。
 * WalletService 用 @MockitoBean 換成假的 → 只驗「身分一律取自 JWT principal，不吃客戶端塞的 userId」。
 * 建錢包不開 HTTP 端點（register 內部呼叫 WalletService 即可），故此處只測 /me/* 查詢。
 */
@WebMvcTest(WalletController.class)
@AutoConfigureMockMvc(addFilters = false)
class WalletControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private WalletService walletService;

	@MockitoBean
	private JwtTokenProvider jwtTokenProvider;

	@MockitoBean
	private UserRepository userRepository;

	// ===== /me/ 查詢：身分一律取自 JWT principal，不吃客戶端塞的 userId（P7 IDOR 對抗式）=====

	@AfterEach
	void clearSecurityContext() {
		SecurityContextHolder.clearContext();
	}

	// 把指定 user 放進 SecurityContext（模擬 JwtAuthFilter 設好的登入身分），回傳其 userId
	private UUID loginAs(String name) {
		UUID userId = UUID.randomUUID();
		User user = new User(name, name + "@test.com", "x");
		ReflectionTestUtils.setField(user, "id", userId);
		SecurityContextHolder.getContext().setAuthentication(
				new UsernamePasswordAuthenticationToken(user, null, List.of()));
		return userId;
	}

	@Test
	@DisplayName("GET /me/balance → 回登入者自己的餘額（userId 取自 principal）")
	void meBalance_returnsCallersOwn() throws Exception {
		UUID me = loginAs("alice");
		when(walletService.getBalance(me)).thenReturn(new BigDecimal("100"));

		mockMvc.perform(get("/api/wallets/me/balance"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.userId").value(me.toString()))
			.andExpect(jsonPath("$.balance").value(100));

		verify(walletService).getBalance(me);
	}

	@Test
	@DisplayName("GY：/me/balance?userId=<別人> → 硬塞的 userId 被無視，仍回自己的")
	void meBalance_ignoresClientSuppliedUserId() throws Exception {
		UUID me = loginAs("alice");
		UUID victim = UUID.randomUUID();
		when(walletService.getBalance(me)).thenReturn(new BigDecimal("1"));

		mockMvc.perform(get("/api/wallets/me/balance").param("userId", victim.toString()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.userId").value(me.toString()));

		verify(walletService).getBalance(me);
		verify(walletService, never()).getBalance(victim);
	}

	@Test
	@DisplayName("GET /me/transactions → 查的是登入者自己的明細（page 預設 0）")
	void meTransactions_returnsCallersOwn() throws Exception {
		UUID me = loginAs("alice");
		when(walletService.getTransactions(me, 0)).thenReturn(List.of());

		mockMvc.perform(get("/api/wallets/me/transactions"))
			.andExpect(status().isOk());

		verify(walletService).getTransactions(me, 0);
	}

	@Test
	@DisplayName("GY：/me/transactions?userId=<別人> → 硬塞的 userId 被無視，查的還是自己")
	void meTransactions_ignoresClientSuppliedUserId() throws Exception {
		UUID me = loginAs("alice");
		UUID victim = UUID.randomUUID();
		when(walletService.getTransactions(me, 0)).thenReturn(List.of());

		mockMvc.perform(get("/api/wallets/me/transactions").param("userId", victim.toString()))
			.andExpect(status().isOk());

		verify(walletService).getTransactions(me, 0);
		verify(walletService, never()).getTransactions(victim, 0);
	}
}
