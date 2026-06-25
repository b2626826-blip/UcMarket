package com.ucmarket.util;

import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Component
public class CodeGenerator {

    private static CodeGenerator instance;

    @PersistenceContext
    private EntityManager em;

    @PostConstruct
    void init() {
        instance = this;
    }

    public static boolean isReady() {
        return instance != null && instance.em != null;
    }

    public static String next(String prefix, String seqName) {
        Long val = (Long) instance.em
                .createNativeQuery("SELECT nextval('" + seqName + "')")
                .getSingleResult();
        return prefix + "-" + String.format("%04d", val);
    }
}
