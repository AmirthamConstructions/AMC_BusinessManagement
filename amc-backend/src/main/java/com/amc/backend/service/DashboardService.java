package com.amc.backend.service;

import com.amc.backend.model.Material;
import com.amc.backend.model.Site;
import com.amc.backend.model.Transaction;
import com.amc.backend.repository.MaterialRepository;
import com.amc.backend.repository.SiteRepository;
import com.amc.backend.repository.TransactionRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final TransactionRepository transactionRepository;
    private final SiteRepository siteRepository;
    private final MaterialRepository materialRepository;

    private static final DateTimeFormatter MONTH_LABEL = DateTimeFormatter.ofPattern("MMM yyyy");
    private static final DateTimeFormatter MONTH_KEY   = DateTimeFormatter.ofPattern("yyyy-MM");

    public DashboardData getDashboardData(LocalDate startDate, LocalDate endDate) {
        List<Transaction> transactions = transactionRepository.findByDateBetween(startDate, endDate);

        // ── KPIs ──────────────────────────────────────────────────────────────
        double revenue = transactions.stream()
                .filter(t -> "Credit".equalsIgnoreCase(t.getType()))
                .mapToDouble(t -> t.getAmount() != null ? t.getAmount() : 0)
                .sum();

        double expenditure = transactions.stream()
                .filter(t -> "Debit".equalsIgnoreCase(t.getType()))
                .mapToDouble(t -> t.getAmount() != null ? t.getAmount() : 0)
                .sum();

        double netProfit = revenue - expenditure;

        // Main company figures
        double mainRevenue = transactions.stream()
                .filter(t -> "Credit".equalsIgnoreCase(t.getType()) && "Main".equalsIgnoreCase(t.getCompany()))
                .mapToDouble(t -> t.getAmount() != null ? t.getAmount() : 0).sum();

        double mainExpenditure = transactions.stream()
                .filter(t -> "Debit".equalsIgnoreCase(t.getType()) && "Main".equalsIgnoreCase(t.getCompany()))
                .mapToDouble(t -> t.getAmount() != null ? t.getAmount() : 0).sum();

        // GST company figures
        double gstRevenue = transactions.stream()
                .filter(t -> "Credit".equalsIgnoreCase(t.getType()) && "GST".equalsIgnoreCase(t.getCompany()))
                .mapToDouble(t -> t.getAmount() != null ? t.getAmount() : 0).sum();

        double gstExpenditure = transactions.stream()
                .filter(t -> "Debit".equalsIgnoreCase(t.getType()) && "GST".equalsIgnoreCase(t.getCompany()))
                .mapToDouble(t -> t.getAmount() != null ? t.getAmount() : 0).sum();

        // Material cost in the period
        List<Material> materials = materialRepository.findByDateBetween(startDate, endDate);
        double materialCost = materials.stream()
                .mapToDouble(m -> m.getAmount() != null ? m.getAmount() : 0).sum();

        // Sites
        List<Site> allSites = siteRepository.findAll();
        long activeSites   = allSites.stream().filter(s -> !"Completed".equals(s.getStatus())).count();
        long inactiveSites = allSites.size() - activeSites;

        DashboardKpis kpis = DashboardKpis.builder()
                .revenue(Math.round(revenue * 100.0) / 100.0)
                .expenditure(Math.round(expenditure * 100.0) / 100.0)
                .netProfit(Math.round(netProfit * 100.0) / 100.0)
                .mainRevenue(Math.round(mainRevenue * 100.0) / 100.0)
                .mainExpenditure(Math.round(mainExpenditure * 100.0) / 100.0)
                .gstRevenue(Math.round(gstRevenue * 100.0) / 100.0)
                .gstExpenditure(Math.round(gstExpenditure * 100.0) / 100.0)
                .materialCost(Math.round(materialCost * 100.0) / 100.0)
                .totalSites((int) allSites.size())
                .activeSites((int) activeSites)
                .inactiveSites((int) inactiveSites)
                .transactionCount(transactions.size())
                .build();

        // ── Charts ────────────────────────────────────────────────────────────
        ChartData monthlyRevenue     = buildMonthlyChart("Monthly Revenue",     transactions, "Credit");
        ChartData monthlyExpenditure = buildMonthlyChart("Monthly Expenditure", transactions, "Debit");
        ChartData siteExpenses       = buildSiteExpenseChart("Site-wise Expenses (Top 10)", transactions);
        ChartData companySplit       = buildCompanySplitChart("Main vs GST", transactions);

        // ── Recent Transactions (last 10) ─────────────────────────────────────
        List<RecentTransaction> recent = transactions.stream()
                .sorted(Comparator.comparing(t -> t.getDate() != null ? t.getDate() : LocalDate.MIN,
                        Comparator.reverseOrder()))
                .limit(10)
                .map(t -> RecentTransaction.builder()
                        .date(t.getDate() != null ? t.getDate().toString() : "")
                        .description(t.getDescription() != null ? t.getDescription() : t.getNature())
                        .type(t.getType())
                        .company(t.getCompany())
                        .siteName(t.getSiteName())
                        .amount(t.getAmount() != null ? t.getAmount() : 0)
                        .party(t.getParty())
                        .build())
                .collect(Collectors.toList());

        return DashboardData.builder()
                .kpis(kpis)
                .monthlyRevenue(monthlyRevenue)
                .monthlyExpenditure(monthlyExpenditure)
                .siteExpenses(siteExpenses)
                .companySplit(companySplit)
                .recentTransactions(recent)
                .startDate(startDate.toString())
                .endDate(endDate.toString())
                .build();
    }

    // ── Chart builders ─────────────────────────────────────────────────────────

    private ChartData buildMonthlyChart(String title, List<Transaction> transactions, String type) {
        // Group by "yyyy-MM" so they sort correctly
        Map<String, Double> raw = new TreeMap<>(transactions.stream()
                .filter(t -> type.equalsIgnoreCase(t.getType()) && t.getDate() != null)
                .collect(Collectors.groupingBy(
                        t -> t.getDate().format(MONTH_KEY),
                        Collectors.summingDouble(t -> t.getAmount() != null ? t.getAmount() : 0)
                )));

        List<String> labels = raw.keySet().stream()
                .map(k -> LocalDate.parse(k + "-01").format(MONTH_LABEL))
                .collect(Collectors.toList());

        List<Double> values = new ArrayList<>(raw.values());

        return ChartData.builder()
                .title(title)
                .dates(labels)
                .values(values)
                .build();
    }

    private ChartData buildSiteExpenseChart(String title, List<Transaction> transactions) {
        // Debit transactions only, group by siteName, top 10 by total
        Map<String, Double> siteData = transactions.stream()
                .filter(t -> "Debit".equalsIgnoreCase(t.getType())
                          && t.getSiteName() != null
                          && !t.getSiteName().trim().isEmpty())
                .collect(Collectors.groupingBy(
                        Transaction::getSiteName,
                        Collectors.summingDouble(t -> t.getAmount() != null ? t.getAmount() : 0)
                ));

        // Sort by value desc, take top 10
        List<Map.Entry<String, Double>> sorted = siteData.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .limit(10)
                .collect(Collectors.toList());

        List<String> categories = sorted.stream().map(Map.Entry::getKey).collect(Collectors.toList());
        List<Double> values     = sorted.stream().map(Map.Entry::getValue).collect(Collectors.toList());

        return ChartData.builder()
                .title(title)
                .categories(categories)
                .values(values)
                .build();
    }

    private ChartData buildCompanySplitChart(String title, List<Transaction> transactions) {
        // Revenue and Expenditure for Main vs GST
        double mainCredit = transactions.stream()
                .filter(t -> "Credit".equalsIgnoreCase(t.getType()) && "Main".equalsIgnoreCase(t.getCompany()))
                .mapToDouble(t -> t.getAmount() != null ? t.getAmount() : 0).sum();
        double mainDebit = transactions.stream()
                .filter(t -> "Debit".equalsIgnoreCase(t.getType()) && "Main".equalsIgnoreCase(t.getCompany()))
                .mapToDouble(t -> t.getAmount() != null ? t.getAmount() : 0).sum();
        double gstCredit = transactions.stream()
                .filter(t -> "Credit".equalsIgnoreCase(t.getType()) && "GST".equalsIgnoreCase(t.getCompany()))
                .mapToDouble(t -> t.getAmount() != null ? t.getAmount() : 0).sum();
        double gstDebit = transactions.stream()
                .filter(t -> "Debit".equalsIgnoreCase(t.getType()) && "GST".equalsIgnoreCase(t.getCompany()))
                .mapToDouble(t -> t.getAmount() != null ? t.getAmount() : 0).sum();

        return ChartData.builder()
                .title(title)
                .categories(Arrays.asList("Main Revenue", "Main Expense", "GST Revenue", "GST Expense"))
                .values(Arrays.asList(
                        Math.round(mainCredit * 100.0) / 100.0,
                        Math.round(mainDebit  * 100.0) / 100.0,
                        Math.round(gstCredit  * 100.0) / 100.0,
                        Math.round(gstDebit   * 100.0) / 100.0
                ))
                .build();
    }

    // ── Company Comparison (R7.5) ────────────────────────────────────────────

    public CompanyComparison getCompanyComparison(LocalDate startDate, LocalDate endDate) {
        List<Transaction> transactions = transactionRepository.findByDateBetween(startDate, endDate);
        List<Site> allSites = siteRepository.findAll();

        // Main company
        double mainRevenue = sumByTypeAndCompany(transactions, "Credit", "Main");
        double mainExpense = sumByTypeAndCompany(transactions, "Debit", "Main");
        long mainSites = allSites.stream().filter(s -> "Main".equalsIgnoreCase(s.getCompany())).count();
        long mainActive = allSites.stream().filter(s -> "Main".equalsIgnoreCase(s.getCompany()) && !"Completed".equals(s.getStatus())).count();

        // GST company
        double gstRevenue = sumByTypeAndCompany(transactions, "Credit", "GST");
        double gstExpense = sumByTypeAndCompany(transactions, "Debit", "GST");
        long gstSites = allSites.stream().filter(s -> "GST".equalsIgnoreCase(s.getCompany())).count();
        long gstActive = allSites.stream().filter(s -> "GST".equalsIgnoreCase(s.getCompany()) && !"Completed".equals(s.getStatus())).count();

        return CompanyComparison.builder()
                .mainRevenue(round2(mainRevenue))
                .mainExpense(round2(mainExpense))
                .mainProfit(round2(mainRevenue - mainExpense))
                .mainSites((int) mainSites)
                .mainActiveSites((int) mainActive)
                .gstRevenue(round2(gstRevenue))
                .gstExpense(round2(gstExpense))
                .gstProfit(round2(gstRevenue - gstExpense))
                .gstSites((int) gstSites)
                .gstActiveSites((int) gstActive)
                .combinedRevenue(round2(mainRevenue + gstRevenue))
                .combinedExpense(round2(mainExpense + gstExpense))
                .combinedProfit(round2((mainRevenue + gstRevenue) - (mainExpense + gstExpense)))
                .combinedSites((int) (mainSites + gstSites))
                .combinedActiveSites((int) (mainActive + gstActive))
                .startDate(startDate.toString())
                .endDate(endDate.toString())
                .build();
    }

    private double sumByTypeAndCompany(List<Transaction> transactions, String type, String company) {
        return transactions.stream()
                .filter(t -> type.equalsIgnoreCase(t.getType()) && company.equalsIgnoreCase(t.getCompany()))
                .mapToDouble(t -> t.getAmount() != null ? t.getAmount() : 0)
                .sum();
    }

    private double round2(double val) {
        return Math.round(val * 100.0) / 100.0;
    }

    // ── DTOs ───────────────────────────────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DashboardData {
        private DashboardKpis kpis;
        private ChartData monthlyRevenue;
        private ChartData monthlyExpenditure;
        private ChartData siteExpenses;
        private ChartData companySplit;
        private List<RecentTransaction> recentTransactions;
        private String startDate;
        private String endDate;
        // Legacy fields kept so existing serialisation doesn't break
        private ChartData chart1;
        private ChartData chart2;
        private ChartData chart3;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DashboardKpis {
        private double revenue;
        private double expenditure;
        private double netProfit;
        private double mainRevenue;
        private double mainExpenditure;
        private double gstRevenue;
        private double gstExpenditure;
        private double materialCost;
        private int totalSites;
        private int activeSites;
        private int inactiveSites;
        private int transactionCount;
        // Legacy field kept
        private double totalProfit;
        private double companyExpenses;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ChartData {
        private String title;
        private List<String> categories;
        private List<String> dates;
        private List<Double> values;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RecentTransaction {
        private String date;
        private String description;
        private String type;
        private String company;
        private String siteName;
        private double amount;
        private String party;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CompanyComparison {
        private double mainRevenue;
        private double mainExpense;
        private double mainProfit;
        private int mainSites;
        private int mainActiveSites;
        private double gstRevenue;
        private double gstExpense;
        private double gstProfit;
        private int gstSites;
        private int gstActiveSites;
        private double combinedRevenue;
        private double combinedExpense;
        private double combinedProfit;
        private int combinedSites;
        private int combinedActiveSites;
        private String startDate;
        private String endDate;
    }
}
