# Excel Integration Guide for Claude

## 🎯 **Quick Start: Excel Commands for Claude**

When users request Excel functionality, Claude can now create, modify, and process Excel files using the integrated Excel editing system.

### **Available Excel Capabilities**
1. **Create new spreadsheets** with openpyxl
2. **Process existing Excel files** with formula preservation
3. **Guide users to visual Excel editor** for complex editing
4. **Generate data analysis** with pandas integration

---

## 📊 **Common Excel Requests & Responses**

### **"Create a budget spreadsheet"**
```python
import openpyxl
from openpyxl.styles import Font, PatternFill, Border, Side

# Create new workbook
wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Budget 2024"

# Headers with formatting
ws['A1'] = 'Category'
ws['B1'] = 'Budgeted'
ws['C1'] = 'Actual'
ws['D1'] = 'Difference'
ws['E1'] = 'Status'

# Style headers
header_font = Font(bold=True, color="FFFFFF")
header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")

for col in ['A1', 'B1', 'C1', 'D1', 'E1']:
    ws[col].font = header_font
    ws[col].fill = header_fill

# Sample data
categories = ['Housing', 'Food', 'Transportation', 'Entertainment', 'Savings']
budgeted = [2000, 800, 400, 200, 500]
actual = [1950, 850, 380, 250, 500]

for i, (cat, bud, act) in enumerate(zip(categories, budgeted, actual), 2):
    ws[f'A{i}'] = cat
    ws[f'B{i}'] = bud
    ws[f'C{i}'] = act
    ws[f'D{i}'] = f'=C{i}-B{i}'  # Difference formula
    ws[f'E{i}'] = f'=IF(D{i}>0,"Over","Under")'  # Status formula

# Totals with formulas
ws['A7'] = 'TOTAL'
ws['B7'] = f'=SUM(B2:B6)'
ws['C7'] = f'=SUM(C2:C6)'
ws['D7'] = f'=SUM(D2:D6)'

# Save file
wb.save('budget_2024.xlsx')
print("✅ Budget spreadsheet created with formulas!")
print("📊 Open Excel Editor at https://my-jarvis-erez.fly.dev to view and edit")
```

### **"Analyze sales data in Excel file"**
```python
import pandas as pd
import openpyxl

# Read Excel file with pandas for analysis
df = pd.read_excel('sales_data.xlsx')

# Generate analysis
analysis = {
    'total_sales': df['sales'].sum(),
    'avg_sales': df['sales'].mean(),
    'top_products': df.groupby('product')['sales'].sum().sort_values(ascending=False).head(5),
    'monthly_trend': df.groupby(df['date'].dt.month)['sales'].sum()
}

print("📊 Sales Analysis Results:")
print(f"Total Sales: ${analysis['total_sales']:,.2f}")
print(f"Average Sales: ${analysis['avg_sales']:.2f}")
print(f"Top 5 Products: {analysis['top_products'].to_dict()}")

# Create summary Excel file with openpyxl for formulas
wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Sales Analysis"

# Add analysis results with formulas
ws['A1'] = 'Sales Analysis Summary'
ws['A3'] = 'Total Sales'
ws['B3'] = f'=SUM(Data!B:B)'  # Assumes data in 'Data' sheet
ws['A4'] = 'Average Sales'
ws['B4'] = f'=AVERAGE(Data!B:B)'

wb.save('sales_analysis.xlsx')
print("✅ Analysis saved to sales_analysis.xlsx")
print("📊 Open Excel Editor to view detailed results with preserved formulas")
```

---

## 🛠️ **Excel Integration Workflow**

### **Step 1: Claude Creates/Processes Excel File**
- Uses `openpyxl` for Excel file creation with formulas
- Uses `pandas` for data analysis and processing
- Saves file to workspace

### **Step 2: Claude Guides User to Excel Editor**
- Provides direct link: https://my-jarvis-erez.fly.dev
- Explains what the user will see
- Mentions specific features (formulas, formatting, etc.)

### **Step 3: User Opens Excel Editor**
- Drag & drop Excel file or use created file
- Real-time preview with virtualized grid
- Edit cells with double-click
- Download modified file

---

## 📋 **Excel Command Templates**

### **Create Financial Reports**
```python
# Monthly P&L template
wb = openpyxl.Workbook()
ws = wb.active
ws.title = "P&L Statement"

# Headers and structure
ws['A1'] = 'Income Statement'
ws['A3'] = 'Revenue'
ws['A4'] = 'Cost of Goods Sold'
ws['A5'] = 'Gross Profit'
ws['B5'] = '=B3-B4'  # Formula for gross profit

# Formatting and conditional formatting
ws['A1'].font = Font(size=16, bold=True)
```

### **Data Processing Templates**
```python
# Process CSV data into Excel with analysis
df = pd.read_csv('data.csv')
with pd.ExcelWriter('processed_data.xlsx', engine='openpyxl') as writer:
    df.to_excel(writer, sheet_name='Raw Data', index=False)

    # Create summary sheet
    summary = df.describe()
    summary.to_excel(writer, sheet_name='Summary')
```

### **Dashboard Creation**
```python
# Create Excel dashboard with charts reference
wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Dashboard"

# Data tables for charts
ws['A1'] = 'Month'
ws['B1'] = 'Sales'
ws['C1'] = 'Growth'

# Chart-ready formulas
ws['C2'] = '=(B2-B1)/B1'  # Growth calculation
```

---

## 🎯 **Integration Triggers**

### **When to Use Excel Integration**
Claude should suggest Excel functionality when users ask for:

- **"Create spreadsheet/table"** → Use openpyxl to create structured Excel file
- **"Budget/financial planning"** → Create budget template with formulas
- **"Data analysis"** → Use pandas + openpyxl for analysis + Excel output
- **"Charts/graphs"** → Create Excel with chart-ready data structure
- **"Invoice/report template"** → Create formatted Excel template
- **"Process CSV data"** → Convert CSV to Excel with analysis

### **Response Pattern**
1. **Acknowledge**: "I'll create that Excel file for you"
2. **Execute**: Write Python code using openpyxl/pandas
3. **Guide**: "Your file is ready! Open the Excel Editor at https://my-jarvis-erez.fly.dev to view and edit it with full formula support"

---

## 🔧 **Technical Integration Notes**

### **File Locations**
- Created Excel files saved in current workspace
- User can upload to Excel Editor via drag & drop
- Download modified files directly from browser

### **Formula Preservation**
- openpyxl maintains all Excel formulas
- Pandas used only for data analysis, not formula manipulation
- Excel Editor preserves formulas during browser editing

### **Performance Considerations**
- Use pandas for heavy data processing
- Use openpyxl for Excel-specific features (formulas, formatting)
- Limit initial data to reasonable sizes for browser rendering

---

## 📚 **Quick Reference**

| User Request | Claude Action | Result |
|--------------|---------------|---------|
| "Create budget" | Use openpyxl template | Formatted Excel with formulas |
| "Analyze data" | pandas + openpyxl summary | Analysis + Excel output |
| "Make invoice template" | openpyxl with formatting | Professional template |
| "Process CSV file" | pandas → openpyxl | Enhanced Excel file |

**Remember**: Always end with guidance to use the Excel Editor for visual editing and formula preservation!