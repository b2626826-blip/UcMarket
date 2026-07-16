package com.ucmarket.util;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

public final class PageParams {

	public static final int DEFAULT_SIZE = 20;
	public static final int MAX_SIZE = 100;

	private PageParams() {}

	public static Pageable of(int page, int size, Sort sort) {
		int safePage = Math.max(page, 0);
		int safeSize = Math.min(Math.max(size, 1), MAX_SIZE);
		return PageRequest.of(safePage, safeSize, sort);
	}

	public static Pageable of(int page, int size, String sortProperty) {
		return of(page, size, Sort.by(Sort.Direction.DESC, sortProperty));
	}
}
