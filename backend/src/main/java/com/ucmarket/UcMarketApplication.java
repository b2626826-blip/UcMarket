package com.ucmarket;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class UcMarketApplication {

	public static void main(String[] args) {
		SpringApplication.run(UcMarketApplication.class, args);
	}

}

