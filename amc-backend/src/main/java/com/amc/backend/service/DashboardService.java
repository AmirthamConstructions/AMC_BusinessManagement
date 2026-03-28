package com.amc.backend.service;

import com.amc.backend.model.Transaction;
import com.amc.backend.repository.TransactionRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final TransactionRepository transactionRepository;

    public DashboardData getDashboardData(LocalDate startDate, LocalDate endDate) {
        List<Transaction> transactions = transactionRepository.findByDateBetween(startDate, endDate);

        double revenue = transactions.stream()
                .filter(t -> "Credit".equalsIgnoreCase(t.getType()))
                .mapToDouble(Transaction::getAmount)
                .sum();

        double expenditure = transactions.stream()
                .filter(t -> "Debit".equalsIgnoreCase(t.getType()))
                .mapToDouble(Transaction::getAmount)
                .sum();

        double totalProfit = revenue - expenditure;

        // Company expenses = Debit transactions for company "Main"
        double companyExpenses = transactions.stream()
                .filter(t -> "Debit".equalsIgnoreCase(t.getType()) && "Main".equalsIgnoreCase(t.getCompany()))
                .mapToDouble(Transaction::getAmount)
                .sum();

        double netProfit = totalProfit - companyExpenses;

        DashboardKpis kpis = DashboardKpis.builder()
                .revenue(revenue)
                .expenditure(expenditure)
                .totalProfit(totalProfit)
                .companyExpenses(companyExpenses)
                .netProfit(netProfit)
                .build();

        // Chart 1: Monthly Revenue
        ChartData chart1 = buildMonthlyChart("Monthly Revenue", transactions, "Credit");

        // Chart 2: Monthly Expenditure
        ChartData chart2 = buildMonthlyChart("Monthly Expenditure", transactions, "Debit");

        // Chart 3: Site-wise expenses
        ChartData chart3 = buildSiteChart("Site-wise Expenses", transactions);

        return DashboardData.builder()
                .kpis(kpis)
                .chart1(chart1)
                .chart2(chart2)
                .chart3(chart3)
                .build();
    }

    private ChartData buildMonthlyChart(String title, List<Transaction> transactions, String type) {
        Map<String, Double> monthlyData = transactions.stream()
                .filter(t -> type.equalsIgnoreCase(t.getType()))
                .collect(Collectors.groupingBy(
                        t -> t.getDate().getMonth().toString(),
                        Collectors.summingDouble(Transaction::getAmount)
                ));

        return ChartData.builder()
                .title(title)
                .categories(new ArrayList<>(monthlyData.keySet()))
                .values(new ArrayList<>(monthlyData.values()))
                .build();
    }

    private ChartData buildSiteChart(String title, List<Transaction> transactions) {
        Map<String, Double> siteData = transactions.stream()
                .filter(t -> t.getSiteName() != null && !t.getSiteName().trim().isEmpty())
                .collect(Collectors.groupingBy(
                        Transaction::getSiteName,
                        Collectors.summingDouble(Transaction::getAmount)
                ));

        return ChartData.builder()
                .title(title)
                .categories(new ArrayList<>(siteData.keySet()))
                .values(new ArrayList<>(siteData.values()))
                .build();
    }

    // Inner DTOs for dashboard
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardData {
        private DashboardKpis kpis;
        private ChartData chart1;
        private ChartData chart2;
        private ChartData chart3;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardKpis {
        private double revenue;
        private double expenditure;
        private double totalProfit;
        private double companyExpenses;
        private double netProfit;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChartData {
        private String title;
        private List<String> categories;
        private List<String> dates;
        private List<Double> values;
    }
}
