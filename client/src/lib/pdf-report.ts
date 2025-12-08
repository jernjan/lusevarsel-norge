import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FishFarm, calculateRiskScore, getRiskLevel, getRiskColor } from './data';
import { COMPANY_NAME, TAGLINE } from './branding';

export async function generatePDFReport(
  farms: FishFarm[],
  companyName: string,
  mapElement?: HTMLElement,
  date: Date = new Date()
): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 10;

  // Header with logo and branding
  doc.setFillColor(14, 165, 233); // Blue
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  // Logo area
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('Helvetica', 'bold');
  doc.text('🐟 AquaShield', 15, 15);
  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  doc.text(TAGLINE, 15, 22);
  
  yPos = 35;

  // Title and metadata
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont('Helvetica', 'bold');
  doc.text('Risikorapport – Lakselusovervåking', 15, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Bedrift: ${companyName}`, 15, yPos);
  yPos += 5;
  doc.text(`Dato: ${date.toLocaleDateString('no-NO')} kl. ${date.toLocaleTimeString('no-NO')}`, 15, yPos);
  yPos += 5;
  doc.text(`Uke: ${getWeekNumber(date)}`, 15, yPos);
  yPos += 10;

  // Kart-snapshot hvis det finnes
  if (mapElement) {
    try {
      doc.setFontSize(12);
      doc.setFont('Helvetica', 'bold');
      doc.text('Risikokart – Aktuelle anlegg', 15, yPos);
      yPos += 8;

      // Capture map as image
      const canvas = await html2canvas(mapElement, {
        allowTaint: true,
        useCORS: true,
        backgroundColor: '#f8fafc',
        scale: 2,
      });
      const imgData = canvas.toDataURL('image/png');
      
      // Calculate dimensions to fit page
      const imgWidth = pageWidth - 30;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add image if it fits on current page, otherwise new page
      if (yPos + imgHeight > pageHeight - 20) {
        doc.addPage();
        yPos = 10;
      }
      
      doc.addImage(imgData, 'PNG', 15, yPos, imgWidth, imgHeight);
      yPos += imgHeight + 10;
    } catch (error) {
      console.warn('Kunne ikke ta kart-snapshot:', error);
    }
  }

  // New page for statistics and table if needed
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = 10;
  }

  // Summary statistics
  doc.setFontSize(12);
  doc.setFont('Helvetica', 'bold');
  doc.text('Oppsummering', 15, yPos);
  yPos += 7;
  
  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  
  const criticalCount = farms.filter(f => getRiskLevel(calculateRiskScore(f)) === 'critical').length;
  const highCount = farms.filter(f => getRiskLevel(calculateRiskScore(f)) === 'high').length;
  const mediumCount = farms.filter(f => getRiskLevel(calculateRiskScore(f)) === 'medium').length;
  const avgLice = farms.reduce((acc, f) => acc + f.liceCount, 0) / farms.length;

  doc.text(`Totalt anlegg overvåket: ${farms.length}`, 15, yPos);
  yPos += 5;
  doc.setTextColor(220, 38, 38);
  doc.text(`🔴 Kritisk (Rød sone): ${criticalCount}`, 15, yPos);
  yPos += 5;
  doc.setTextColor(234, 88, 12);
  doc.text(`🟠 Høy (Orange): ${highCount}`, 15, yPos);
  yPos += 5;
  doc.setTextColor(250, 191, 36);
  doc.text(`🟡 Moderat (Gul): ${mediumCount}`, 15, yPos);
  yPos += 5;
  doc.setTextColor(0, 0, 0);
  doc.text(`Gjennomsnittlig lakselus (hunnlus): ${avgLice.toFixed(2)}`, 15, yPos);
  yPos += 10;

  // Top 20 risk farms
  doc.setFontSize(12);
  doc.setFont('Helvetica', 'bold');
  doc.text('Topp 20 anlegg etter risiko', 15, yPos);
  yPos += 7;

  doc.setFontSize(9);
  doc.setFont('Helvetica', 'normal');
  
  const topFarms = farms.slice(0, 20);
  const colX = [15, 60, 100, 130, 160];
  const colWidths = [45, 40, 30, 30, 20];
  
  // Header row
  doc.setFont('Helvetica', 'bold');
  doc.setFillColor(230, 230, 230);
  doc.rect(colX[0], yPos - 4, colWidths[0], 5, 'F');
  doc.text('Anlegg', colX[0] + 2, yPos);
  doc.rect(colX[1], yPos - 4, colWidths[1], 5, 'F');
  doc.text('Lokalitet', colX[1] + 2, yPos);
  doc.rect(colX[2], yPos - 4, colWidths[2], 5, 'F');
  doc.text('Lus', colX[2] + 2, yPos);
  doc.rect(colX[3], yPos - 4, colWidths[3], 5, 'F');
  doc.text('Risiko', colX[3] + 2, yPos);
  
  yPos += 6;
  doc.setFont('Helvetica', 'normal');

  topFarms.forEach((farm, idx) => {
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = 10;
    }

    const score = calculateRiskScore(farm);
    const level = getRiskLevel(score);
    const levelText = {
      'critical': 'Kritisk',
      'high': 'Høy',
      'medium': 'Moderat',
      'low': 'Lav'
    }[level];

    // Alternate row colors
    if (idx % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(15, yPos - 4, pageWidth - 30, 5, 'F');
    }

    doc.text(`${idx + 1}. ${farm.name.substring(0, 25)}`, colX[0] + 1, yPos);
    doc.text(farm.id, colX[1] + 1, yPos);
    doc.text(`${farm.liceCount.toFixed(2)}`, colX[2] + 1, yPos);
    doc.setFont('Helvetica', 'bold');
    doc.text(levelText, colX[3] + 1, yPos);
    doc.setFont('Helvetica', 'normal');

    yPos += 5;
  });

  yPos += 5;

  // Warnings and alerts
  const farmswithDisease = farms.filter(f => f.disease);
  const farmsInQuarantine = farms.filter(f => f.inQuarantine);
  const forcedSlaughterFarms = farms.filter(f => f.forcedSlaughter);

  if (farmswithDisease.length > 0 || farmsInQuarantine.length > 0 || forcedSlaughterFarms.length > 0) {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 10;
    }

    doc.setFontSize(12);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text('⚠ Viktige varsler', 15, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    if (forcedSlaughterFarms.length > 0) {
      doc.text(`🔴 Tvangsslakting (${forcedSlaughterFarms.length} anlegg):`, 15, yPos);
      yPos += 4;
      forcedSlaughterFarms.slice(0, 3).forEach(farm => {
        doc.text(`  • ${farm.name}`, 15, yPos);
        yPos += 4;
      });
      yPos += 2;
    }

    if (farmswithDisease.length > 0) {
      doc.text(`🦠 Sykdom påvist (${farmswithDisease.length} anlegg):`, 15, yPos);
      yPos += 4;
      farmswithDisease.slice(0, 3).forEach(farm => {
        doc.text(`  • ${farm.name}: ${farm.disease}`, 15, yPos);
        yPos += 4;
      });
      yPos += 2;
    }

    if (farmsInQuarantine.length > 0) {
      doc.text(`⛔ I karantene (${farmsInQuarantine.length} anlegg):`, 15, yPos);
      yPos += 4;
      farmsInQuarantine.slice(0, 3).forEach(farm => {
        doc.text(`  • ${farm.name}`, 15, yPos);
        yPos += 4;
      });
    }
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Denne rapporten ble generert automatisk av AquaShield – Profesjonell overvåking av lakselus', 15, pageHeight - 10);
  doc.text(`Kilde: BarentsWatch API, Fiskeridirektoratet`, 15, pageHeight - 5);

  // Save PDF
  const filename = `AquaShield_Rapport_${companyName}_${date.toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
