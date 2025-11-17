/**
 * Feedback Export Utilities
 * 
 * Functions for exporting feedback analytics data as CSV or PDF
 */

import type { FeedbackMetrics, RatingAverage, TextTheme, GroupedResponse } from "./feedbackAnalytics";
import { format } from "date-fns";

interface ExportData {
  eventName: string;
  societyName: string;
  exportDate: string;
  metrics: FeedbackMetrics;
  ratingAverages: RatingAverage[];
  textThemes: TextTheme[];
  groupedResponses: GroupedResponse[];
}

/**
 * Export feedback data as CSV file
 */
export function exportFeedbackAsCSV(data: ExportData): void {
  let csvContent = "";
  
  // Header section
  csvContent += `Event Feedback Analytics Report\n`;
  csvContent += `Society,${data.societyName}\n`;
  csvContent += `Event,${data.eventName}\n`;
  csvContent += `Export Date,${data.exportDate}\n`;
  csvContent += `\n`;
  
  // Summary metrics
  csvContent += `SUMMARY METRICS\n`;
  csvContent += `Metric,Value\n`;
  csvContent += `Total Responses,${data.metrics.totalResponses}\n`;
  csvContent += `Response Rate,${data.metrics.responseRate}%\n`;
  csvContent += `Average Rating,${data.metrics.averageRating}/5\n`;
  csvContent += `\n`;
  
  // Rating averages
  if (data.ratingAverages.length > 0) {
    csvContent += `RATING QUESTIONS - AVERAGE SCORES\n`;
    csvContent += `Question,Average Rating,Response Count\n`;
    data.ratingAverages.forEach(rating => {
      const question = rating.question.replace(/,/g, ';'); // Replace commas to avoid CSV issues
      csvContent += `"${question}",${rating.average.toFixed(2)},${rating.count}\n`;
    });
    csvContent += `\n`;
  }
  
  // Common themes
  if (data.textThemes.length > 0) {
    csvContent += `COMMON THEMES FROM TEXT RESPONSES\n`;
    csvContent += `Theme,Frequency\n`;
    data.textThemes.forEach(theme => {
      csvContent += `${theme.word},${theme.count}\n`;
    });
    csvContent += `\n`;
  }
  
  // Individual responses
  csvContent += `ALL INDIVIDUAL RESPONSES\n`;
  csvContent += `Question,Question Type,Answer,Submitted At,Anonymous\n`;
  
  data.groupedResponses.forEach(group => {
    const question = group.question.replace(/,/g, ';');
    group.answers.forEach(answer => {
      const answerValue = group.questionType === 'rating' 
        ? `${answer.answerRating || 'N/A'} stars`
        : `"${(answer.answerText || '').replace(/"/g, '""')}"`;
      const submittedAt = format(new Date(answer.submittedAt), "yyyy-MM-dd HH:mm");
      csvContent += `"${question}",${group.questionType},${answerValue},${submittedAt},${answer.isAnonymous ? 'Yes' : 'No'}\n`;
    });
  });
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  const filename = `feedback-analytics-${data.eventName.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export feedback data as PDF (via print dialog)
 */
export function exportFeedbackAsPDF(data: ExportData): void {
  // Create a new window with formatted content
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    throw new Error('Please allow pop-ups to export as PDF');
  }
  
  // Generate HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Feedback Analytics - ${data.eventName}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px;
            color: #1a1a1a;
            line-height: 1.6;
          }
          h1 {
            font-size: 24px;
            margin-bottom: 10px;
            color: #0f172a;
          }
          h2 {
            font-size: 18px;
            margin-top: 30px;
            margin-bottom: 15px;
            color: #334155;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 5px;
          }
          h3 {
            font-size: 14px;
            margin-top: 20px;
            margin-bottom: 10px;
            color: #475569;
          }
          .header {
            margin-bottom: 40px;
            border-bottom: 3px solid #0f172a;
            padding-bottom: 20px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            font-size: 14px;
            color: #64748b;
          }
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin: 20px 0;
          }
          .metric-card {
            border: 1px solid #e2e8f0;
            padding: 15px;
            border-radius: 8px;
            background: #f8fafc;
          }
          .metric-label {
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .metric-value {
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 13px;
          }
          th {
            background: #f1f5f9;
            padding: 10px;
            text-align: left;
            font-weight: 600;
            border: 1px solid #e2e8f0;
          }
          td {
            padding: 8px 10px;
            border: 1px solid #e2e8f0;
          }
          tr:nth-child(even) {
            background: #f8fafc;
          }
          .themes {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 15px 0;
          }
          .theme-badge {
            background: #e0f2fe;
            color: #0369a1;
            padding: 6px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 500;
          }
          .response-group {
            margin: 20px 0;
            padding: 15px;
            background: #f8fafc;
            border-left: 3px solid #3b82f6;
            page-break-inside: avoid;
          }
          .response-item {
            margin: 10px 0;
            padding: 10px;
            background: white;
            border-radius: 4px;
            font-size: 13px;
          }
          .response-meta {
            font-size: 11px;
            color: #64748b;
            margin-top: 5px;
          }
          .stars {
            color: #f59e0b;
            font-size: 14px;
          }
          @media print {
            body {
              padding: 20px;
            }
            .metrics-grid {
              page-break-inside: avoid;
            }
            table {
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Post-Event Feedback Analytics Report</h1>
          <div class="info-row">
            <span><strong>Society:</strong> ${data.societyName}</span>
            <span><strong>Event:</strong> ${data.eventName}</span>
          </div>
          <div class="info-row">
            <span><strong>Export Date:</strong> ${data.exportDate}</span>
            <span><strong>Total Responses:</strong> ${data.metrics.totalResponses}</span>
          </div>
        </div>

        <h2>Summary Metrics</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Total Responses</div>
            <div class="metric-value">${data.metrics.totalResponses}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Response Rate</div>
            <div class="metric-value">${data.metrics.responseRate}%</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Average Rating</div>
            <div class="metric-value">${data.metrics.averageRating}/5</div>
          </div>
        </div>

        ${data.ratingAverages.length > 0 ? `
          <h2>Rating Questions - Average Scores</h2>
          <table>
            <thead>
              <tr>
                <th>Question</th>
                <th style="text-align: center; width: 120px;">Average Rating</th>
                <th style="text-align: center; width: 100px;">Responses</th>
              </tr>
            </thead>
            <tbody>
              ${data.ratingAverages.map(rating => `
                <tr>
                  <td>${rating.question}</td>
                  <td style="text-align: center;"><strong>${rating.average.toFixed(2)}</strong>/5</td>
                  <td style="text-align: center;">${rating.count}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${data.textThemes.length > 0 ? `
          <h2>Common Themes from Text Responses</h2>
          <div class="themes">
            ${data.textThemes.map(theme => `
              <span class="theme-badge">${theme.word} (${theme.count})</span>
            `).join('')}
          </div>
        ` : ''}

        <h2>All Individual Responses</h2>
        ${data.groupedResponses.map(group => `
          <div class="response-group">
            <h3>${group.question}</h3>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 10px;">
              Type: ${group.questionType} | Total Responses: ${group.answers.length}
            </div>
            ${group.answers.map(answer => `
              <div class="response-item">
                ${group.questionType === 'rating' ? `
                  <div class="stars">${'★'.repeat(answer.answerRating || 0)}${'☆'.repeat(5 - (answer.answerRating || 0))} (${answer.answerRating}/5)</div>
                ` : `
                  <div>${answer.answerText || 'No response'}</div>
                `}
                <div class="response-meta">
                  Submitted: ${format(new Date(answer.submittedAt), "MMM dd, yyyy 'at' HH:mm")}
                  ${answer.isAnonymous ? ' • Anonymous' : ''}
                </div>
              </div>
            `).join('')}
          </div>
        `).join('')}

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 100);
          };
        </script>
      </body>
    </html>
  `;
  
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
