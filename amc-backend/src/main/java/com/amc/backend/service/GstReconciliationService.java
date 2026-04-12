package com.amc.backend.service;

import com.amc.backend.dto.GstReconciliation;
import com.amc.backend.model.GstInward;
import com.amc.backend.model.GstOutward;
import com.amc.backend.repository.GstInwardRepository;
import com.amc.backend.repository.GstOutwardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GstReconciliationService {

    private final GstInwardRepository gstInwardRepository;
    private final GstOutwardRepository gstOutwardRepository;

    public GstReconciliation reconcile(String year, String month) {
        List<GstOutward> outwardList = gstOutwardRepository.findByYearAndInvoiceMonth(year, month);
        List<GstInward> inwardList = gstInwardRepository.findByYearAndInvoiceMonth(year, month);

        // Outward aggregates
        double outwardTaxable = outwardList.stream()
                .mapToDouble(o -> o.getTaxableValue() != null ? o.getTaxableValue() : 0).sum();
        double outwardCgst = outwardList.stream()
                .mapToDouble(o -> o.getCgstAmount() != null ? o.getCgstAmount() : 0).sum();
        double outwardSgst = outwardList.stream()
                .mapToDouble(o -> o.getSgstAmount() != null ? o.getSgstAmount() : 0).sum();
        double outwardInvoiceVal = outwardList.stream()
                .mapToDouble(o -> o.getInvoiceValue() != null ? o.getInvoiceValue() : 0).sum();

        // Inward aggregates
        double inwardTaxable = inwardList.stream()
                .mapToDouble(i -> i.getTaxableValue() != null ? i.getTaxableValue() : 0).sum();
        double inwardCgst = inwardList.stream()
                .mapToDouble(i -> i.getCgstAmount() != null ? i.getCgstAmount() : 0).sum();
        double inwardSgst = inwardList.stream()
                .mapToDouble(i -> i.getSgstAmount() != null ? i.getSgstAmount() : 0).sum();
        double inwardPurchaseVal = inwardList.stream()
                .mapToDouble(i -> i.getPurchaseBillValue() != null ? i.getPurchaseBillValue() : 0).sum();

        double outputTax = outwardCgst + outwardSgst;
        double inputTaxCredit = inwardCgst + inwardSgst;
        double netPayable = outputTax - inputTaxCredit;

        // Build detail rows
        List<GstReconciliation.OutwardSummaryRow> outwardDetails = outwardList.stream()
                .map(o -> GstReconciliation.OutwardSummaryRow.builder()
                        .invoiceNo(o.getInvoiceNo())
                        .invoiceDate(o.getInvoiceDate() != null ? o.getInvoiceDate().toString() : "")
                        .customerName(o.getCustomerName())
                        .customerGSTIN(o.getCustomerGSTIN())
                        .taxableValue(o.getTaxableValue())
                        .cgst(o.getCgstAmount())
                        .sgst(o.getSgstAmount())
                        .invoiceValue(o.getInvoiceValue())
                        .build())
                .collect(Collectors.toList());

        List<GstReconciliation.InwardSummaryRow> inwardDetails = inwardList.stream()
                .map(i -> GstReconciliation.InwardSummaryRow.builder()
                        .purchaseBillNo(i.getPurchaseBillNo())
                        .invoiceDate(i.getInvoiceDate() != null ? i.getInvoiceDate().toString() : "")
                        .companyName(i.getCompanyName())
                        .companyGSTIN(i.getCompanyGSTIN())
                        .taxableValue(i.getTaxableValue())
                        .cgst(i.getCgstAmount())
                        .sgst(i.getSgstAmount())
                        .purchaseBillValue(i.getPurchaseBillValue())
                        .build())
                .collect(Collectors.toList());

        return GstReconciliation.builder()
                .year(year)
                .month(month)
                .outwardInvoiceCount(outwardList.size())
                .outwardTaxableValue(outwardTaxable)
                .outwardCgst(outwardCgst)
                .outwardSgst(outwardSgst)
                .outwardTotalTax(outputTax)
                .outwardInvoiceValue(outwardInvoiceVal)
                .inwardInvoiceCount(inwardList.size())
                .inwardTaxableValue(inwardTaxable)
                .inwardCgst(inwardCgst)
                .inwardSgst(inwardSgst)
                .inwardTotalTax(inputTaxCredit)
                .inwardPurchaseValue(inwardPurchaseVal)
                .outputTax(outputTax)
                .inputTaxCredit(inputTaxCredit)
                .netGstPayable(netPayable)
                .outwardDetails(outwardDetails)
                .inwardDetails(inwardDetails)
                .build();
    }
}
