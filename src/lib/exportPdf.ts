import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Deposit } from './supabase'
import { ClosedPosition } from '@/components/ClosedPositionsTable'
import {
  calculateCurrentValue,
  calculateInterestEarned,
  getCompleteWeeks,
  getFirstWeekStart,
  formatCurrency,
  formatDate,
  getDayOfWeek,
} from './interest'

export function exportToPdf(deposits: Deposit[], closedPositions: ClosedPosition[] = []) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  // Colors
  const primaryColor: [number, number, number] = [34, 197, 94] // Green accent
  const darkColor: [number, number, number] = [15, 23, 42]
  const grayColor: [number, number, number] = [100, 116, 139]

  // Header
  doc.setFillColor(...darkColor)
  doc.rect(0, 0, pageWidth, 45, 'F')

  // Logo/Title
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('Inessa Holdings', 20, 25)

  // Subtitle
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 200, 200)
  doc.text('Fund Deployment Summary Report', 20, 35)

  // Date
  doc.setFontSize(10)
  doc.setTextColor(200, 200, 200)
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  doc.text(`Generated: ${currentDate}`, pageWidth - 20, 35, { align: 'right' })

  // Calculate totals
  const totals = deposits.reduce(
    (acc, deposit) => {
      const depositDate = new Date(deposit.deposit_date + 'T00:00:00')
      const currentValue = calculateCurrentValue(deposit.amount, depositDate)
      const interest = calculateInterestEarned(deposit.amount, depositDate)

      return {
        principal: acc.principal + deposit.amount,
        currentValue: acc.currentValue + currentValue,
        interest: acc.interest + interest,
      }
    },
    { principal: 0, currentValue: 0, interest: 0 }
  )

  // Summary Cards
  let yPos = 60

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...darkColor)
  doc.text('Active Portfolio Summary', 20, yPos)

  yPos += 10

  // Summary boxes
  const boxWidth = (pageWidth - 60) / 3
  const boxHeight = 30
  const boxY = yPos

  // Box 1 - Total Deposited
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(20, boxY, boxWidth, boxHeight, 3, 3, 'F')
  doc.setFontSize(8)
  doc.setTextColor(...grayColor)
  doc.text('Total Deposited', 25, boxY + 10)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...darkColor)
  doc.text(formatCurrency(totals.principal), 25, boxY + 22)

  // Box 2 - Current Value
  doc.setFillColor(240, 253, 244)
  doc.roundedRect(30 + boxWidth, boxY, boxWidth, boxHeight, 3, 3, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...grayColor)
  doc.text('Current Value', 35 + boxWidth, boxY + 10)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...primaryColor)
  doc.text(formatCurrency(totals.currentValue), 35 + boxWidth, boxY + 22)

  // Box 3 - Total Interest
  doc.setFillColor(240, 253, 244)
  doc.roundedRect(40 + boxWidth * 2, boxY, boxWidth, boxHeight, 3, 3, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...grayColor)
  doc.text('Total Interest Earned', 45 + boxWidth * 2, boxY + 10)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...primaryColor)
  doc.text(`+${formatCurrency(totals.interest)}`, 45 + boxWidth * 2, boxY + 22)

  yPos = boxY + boxHeight + 20

  // Deposits Table
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...darkColor)
  doc.text('Active Deposit Details', 20, yPos)

  yPos += 5

  // Prepare table data
  const tableData = deposits.map((deposit) => {
    const depositDate = new Date(deposit.deposit_date + 'T00:00:00')
    const currentValue = calculateCurrentValue(deposit.amount, depositDate)
    const interest = calculateInterestEarned(deposit.amount, depositDate)
    const weeks = getCompleteWeeks(depositDate)
    const firstWeekStart = getFirstWeekStart(depositDate)

    return [
      formatDate(depositDate),
      getDayOfWeek(depositDate),
      formatCurrency(deposit.amount),
      formatDate(firstWeekStart),
      `${weeks} week${weeks !== 1 ? 's' : ''}`,
      `+${formatCurrency(interest)}`,
      formatCurrency(currentValue),
    ]
  })

  autoTable(doc, {
    startY: yPos,
    head: [['Deposit Date', 'Day', 'Principal', 'Week 1 Starts', 'Weeks', 'Interest', 'Current Value']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: darkColor,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: darkColor,
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 22 },
      2: { halign: 'right', cellWidth: 28 },
      3: { cellWidth: 25 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'right', cellWidth: 25, textColor: primaryColor },
      6: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 20, right: 20 },
  })

  let finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  // Closed Positions Section
  if (closedPositions.length > 0) {
    const closedTotals = closedPositions.reduce(
      (acc, pos) => ({
        principal: acc.principal + pos.principal,
        interest: acc.interest + pos.interestRedeemed,
        payout: acc.payout + pos.totalPayout,
      }),
      { principal: 0, interest: 0, payout: 0 }
    )

    yPos = finalY + 20

    // Check if we need a new page
    if (yPos > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage()
      yPos = 20
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...darkColor)
    doc.text('Closed Positions', 20, yPos)

    yPos += 10

    // Summary boxes for closed positions
    const cBoxY = yPos

    doc.setFillColor(248, 250, 252)
    doc.roundedRect(20, cBoxY, boxWidth, boxHeight, 3, 3, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...grayColor)
    doc.text('Principal Returned', 25, cBoxY + 10)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...darkColor)
    doc.text(formatCurrency(closedTotals.principal), 25, cBoxY + 22)

    doc.setFillColor(240, 253, 244)
    doc.roundedRect(30 + boxWidth, cBoxY, boxWidth, boxHeight, 3, 3, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...grayColor)
    doc.text('Interest Redeemed', 35 + boxWidth, cBoxY + 10)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...primaryColor)
    doc.text(`+${formatCurrency(closedTotals.interest)}`, 35 + boxWidth, cBoxY + 22)

    doc.setFillColor(240, 253, 244)
    doc.roundedRect(40 + boxWidth * 2, cBoxY, boxWidth, boxHeight, 3, 3, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...grayColor)
    doc.text('Total Payouts', 45 + boxWidth * 2, cBoxY + 10)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...darkColor)
    doc.text(formatCurrency(closedTotals.payout), 45 + boxWidth * 2, cBoxY + 22)

    yPos = cBoxY + boxHeight + 10

    const closedTableData = closedPositions.map((pos) => [
      formatDate(pos.depositDate + 'T00:00:00'),
      formatDate(pos.closureDate + 'T00:00:00'),
      formatCurrency(pos.principal),
      `${pos.weeksElapsed} week${pos.weeksElapsed !== 1 ? 's' : ''}`,
      `+${formatCurrency(pos.interestRedeemed)}`,
      formatCurrency(pos.totalPayout),
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['Deposit Date', 'Closure Date', 'Principal', 'Weeks', 'Interest Redeemed', 'Total Payout']],
      body: closedTableData,
      theme: 'grid',
      headStyles: {
        fillColor: darkColor,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'left',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: darkColor,
      },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 28 },
        2: { halign: 'right', cellWidth: 28 },
        3: { halign: 'center', cellWidth: 22 },
        4: { halign: 'right', cellWidth: 30, textColor: primaryColor },
        5: { halign: 'right', cellWidth: 30, fontStyle: 'bold' },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 20, right: 20 },
    })

    finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  }

  // Footer
  finalY += 15

  doc.setDrawColor(200, 200, 200)
  doc.line(20, finalY, pageWidth - 20, finalY)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...grayColor)
  doc.text('Interest Rate: 0.5% compound per complete week (Monday-Sunday)', 20, finalY + 8)
  doc.text('Week 1 starts from the coming Monday after deposit date', 20, finalY + 14)

  // Page number
  doc.text(`Page 1 of 1`, pageWidth - 20, finalY + 8, { align: 'right' })

  // Save the PDF
  const fileName = `Inessa_Holdings_Summary_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}
