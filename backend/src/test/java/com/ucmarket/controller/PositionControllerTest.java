package com.ucmarket.controller;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
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
import com.ucmarket.service.PositionService;

@WebMvcTest(PositionController.class)
@AutoConfigureMockMvc(addFilters = false)
class PositionControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private PositionService positionService;

	@MockitoBean
	private JwtTokenProvider jwtTokenProvider;

	@MockitoBean
	private UserRepository userRepository;

	@AfterEach
	void clearSecurityContext() {
		SecurityContextHolder.clearContext();
	}

	@Test
	void getMyPositions_usesAuthenticatedUser() throws Exception {
		UUID me = loginAs("alice");
		UUID otherUser = UUID.randomUUID();
		when(positionService.getPositionsByUserId(me)).thenReturn(List.of());

		mockMvc.perform(get("/api/positions/me").param("userId", otherUser.toString()))
				.andExpect(status().isOk());

		verify(positionService).getPositionsByUserId(me);
		verify(positionService, never()).getPositionsByUserId(otherUser);
	}

	@Test
	void getMyOpenPositions_usesAuthenticatedUser() throws Exception {
		UUID me = loginAs("alice");
		UUID otherUser = UUID.randomUUID();
		when(positionService.getOpenPositionsByUserId(me)).thenReturn(List.of());

		mockMvc.perform(get("/api/positions/me/open").param("userId", otherUser.toString()))
				.andExpect(status().isOk());

		verify(positionService).getOpenPositionsByUserId(me);
		verify(positionService, never()).getOpenPositionsByUserId(otherUser);
	}

	private UUID loginAs(String name) {
		UUID userId = UUID.randomUUID();
		User user = new User(name, name + "@test.com", "x");
		ReflectionTestUtils.setField(user, "id", userId);
		SecurityContextHolder.getContext().setAuthentication(
				new UsernamePasswordAuthenticationToken(user, null, List.of()));
		return userId;
	}
}
