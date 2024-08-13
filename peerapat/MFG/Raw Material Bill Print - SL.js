/**
 * @NApiVersion 2.0
 * @NScriptType Suitelet
 */
define(['N/query'], function (query) {
    function onRequest(context) {
        if (context.request.method === 'GET') {
            var begindate = decodeURIComponent(context.request.parameters.begindate);
            var enddate = decodeURIComponent(context.request.parameters.enddate); 
            var filter1 = context.request.parameters.filter1;
            var filter2 = context.request.parameters.filter2;
            var filterlo = context.request.parameters.filterlo;

            log.debug('filterlo',filterlo);

            var tempDataArr = getRawMaterial(begindate,enddate,filter1,filter2,filterlo);
            log.debug('tempDataArr',tempDataArr);
            var tableRows = '';
            var totQTY = 0;
            Object.keys(tempDataArr).forEach(function(itemcode) {
                
                if (tempDataArr[itemcode].lot.length == 0) {
                    tableRows += '<tr>' +
                    '<td>' + itemcode + '</td>' +
                    '<td>' + tempDataArr[itemcode].itemname + '</td>' +
                    '<td>' + tempDataArr[itemcode].quantity + '</td>' +
                    '<td></td>' +
                    '<td></td>' +
                    '<td></td>';
                } else {

                    
                    var spanstr = '';
                    if (tempDataArr[itemcode].lot.length > 1) {
                        spanstr = 'rowspan="'+ tempDataArr[itemcode].lot.length + '"';
                    }
                    var count = 0;
                    tempDataArr[itemcode].lot.forEach(function(lotobj) {

                        if(count==0) {
                            tableRows += '<tr>' +
                            '<td '+ spanstr + '">' + itemcode + '</td>' +
                            '<td '+ spanstr + '">' + tempDataArr[itemcode].itemname + '</td>' +                            
                            '<td>' + lotobj.quantity + '</td>' +
                            '<td>' + lotobj.lotno + '</td>' +
                            '<td '+ spanstr + '"></td>' +
                            '<td '+ spanstr + '"></td>' +
                            '</tr>';                         
                        } else {
                            tableRows += '<tr>' +
                            '<td>' + lotobj.quantity + '</td>' +
                            '<td>' + lotobj.lotno + '</td>' +
                            '</tr>';                           
                        }
                        count++;
                        return true;
                    })
                }
        
                totQTY += tempDataArr[itemcode].quantity;            
                return true;
            });

            tableRows += '<tr>' +
            '<td colspan="2">Total</td>' +
            '<td>' + totQTY.round(2) + '</td>'+
            '<td></td>' +
            '<td></td>' +
            '<td></td>' +
            '</tr>';  

            var htmlContent = '<!DOCTYPE html>' +
                '<html lang="en">' +
                '<head>' +
                '<meta charset="UTF-8">' +
                '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
                '<title>ใบเบิกวัตถุดิบรวม(ภายใน)</title>' +
                '<style>' +
                '@page {' +
                'size: A4;' +
                'margin: 10mm;' +
                '}' +
                'body {' +
                'font-family: Arial, sans-serif;' +
                'margin: 0;' +
                'padding: 0;' +
                '}' +
                '.container {' +
                'width: 100%;' +
                'max-width: 100%;' +
                'margin: auto;' +
                'padding: 20px;' +
                'box-sizing: border-box;' +
                '}' +
                '.header {' +
                'text-align: center;' +
                'margin-bottom: 20px;' +
                'position: relative;' +
                '}' +
                '.header h1 {' +
                'font-size: 18px;' +
                'margin: 0;' +
                '}' +
                '.header p {' +
                'margin: 5px 0;' +
                '}' +
                '.header-row {' +
                'display: flex;' +
                'justify-content: space-between;' +
                'align-items: center;' +
                'margin-top: 10px;' +
                '}' +
                '.table-container {' +
                'width: 100%;' +
                'overflow-x: auto;' +
                '}' +
                'table {' +
                'width: 100%;' +
                'border-collapse: collapse;' +
                '}' +
                'th, td {' +
                'border: 1px solid #000;' +
                'padding: 8px;' +
                'text-align: center;' +
                '}' +
                'th {' +
                'background-color: #f2f2f2;' +
                '}' +
                '.footer {' +
                'margin-top: 20px;' +
                'display: flex;' +
                'justify-content: space-between;' +
                '}' +
                '</style>' +
                '</head>' +
                '<body>' +
                '<div class="container">' +
                '<div class="header">' +
                '<h1>ใบเบิกวัตถุดิบรวม(ภายใน)</h1>' +
                '<p>PEERAPAT TECHNOLOGY PUBLIC COMPANY LIMITED</p>' +
                '<div class="header-row">' +
                '<p>รายการวัตถุดิบที่ใช้</p>' +
                '<p>วันที่ ' + begindate + '</p>' +
                '</div>' +
                '</div>' +
                '<div class="table-container">' +
                '<table>' +
                '<thead>' +
                '<tr>' +
                '<th rowspan="2">รหัสวัตถุดิบ</th>' +
                '<th rowspan="2">ชื่อวัตถุดิบ</th>' +
                '<th rowspan="2">จำนวนที่ใช้ (Kg.)</th>' +
                '<th rowspan="2">Lot</th>' +
                '<th colspan="2">ตรวจสอบ Lot./จำนวน</th>' +
                '</tr>' +
                '<tr>' +
                '<th>/</th>' +
                '<th>X</th>' +
                '</tr>' +
                '</thead>' +
                '<tbody>' +
                tableRows +
                '</tbody>' +
                '</table>' +
                '</div>' +
                '<div class="footer">' +
                '<p>ผู้รับ ..............................</p>' +
                '<p>ผู้จ่าย/ผู้ตรวจสอบ Lot. ..............................</p>' +
                '<p>ISO No.QMS-FM-30-005(R00.,06/10/2014)</p>' +
                '</div>' +
                '</div>' +
                '</body>' +
                '</html>';

            context.response.write(htmlContent);
        }
    }

    function getRawMaterial(begindate,enddate,filter1,filter2,filterlo) {
        var sql = "SELECT \
            item.itemId as itemcode, \
            item.displayName as itemname, \
            SUM(NVL(InventoryAssignment.quantity,TransactionLine.quantity)) as quantity, \
            InventoryNumber.inventoryNumber as lotno \
        FROM \
            TransactionLine \
        LEFT OUTER JOIN item ON TransactionLine.item = item.id \
        LEFT OUTER JOIN InventoryAssignment ON  (TransactionLine.Transaction = InventoryAssignment.Transaction ) AND (TransactionLine.id =InventoryAssignment.transactionline) \
        LEFT OUTER JOIN InventoryNumber ON   ( InventoryAssignment.InventoryNumber = InventoryNumber.id) and ( InventoryNumber.Item = TransactionLine.Item) \
        INNER JOIN Transaction ON  ( Transaction.ID = TransactionLine.Transaction ) \
        LEFT OUTER JOIN PreviousTransactionLink ON PreviousTransactionLink.nextdoc = transaction.id and PreviousTransactionLink.linktype = 'OrdBuild' \
        LEFT OUTER JOIN Transaction  PrevTrans ON (PreviousTransactionLink.previousdoc = PrevTrans.id) \
        WHERE  ( Transaction.Voided = 'F') \
        AND (Transaction.type = 'WOIssue') \
        AND (TransactionLine.isinventoryaffecting = 'T') \
        AND NVL(InventoryAssignment.quantity,TransactionLine.quantity) != '0'"

        if(!isEmpty(begindate) && !isEmpty(enddate)) {
            sql += " AND PrevTrans.startdate  between '" + begindate + "' AND '" + enddate + "'";
        }
        

        if(!isEmpty(filter1)) {
            sql += " AND PrevTrans.custbody_wo_assy_filter1 = " + filter1;
        }
        if(!isEmpty(filter2)) {
            sql += " AND PrevTrans.custbody_wo_assy_filter2 = " + filter2;
        }
        if(!isEmpty(filterlo)) {
            sql += " AND TransactionLine.location = " + filterlo;
        }

        sql += " GROUP BY item.itemId, item.displayName, InventoryNumber.inventoryNumber";

        sql += " order by item.itemId, InventoryNumber.inventoryNumber"

        var rmArr = runQuery(sql);
        var rmObjArr = {};
        rmArr.forEach(function(tempObj) {
            if (typeof rmObjArr[tempObj.itemcode] == 'undefined') {
                rmObjArr[tempObj.itemcode] = {
                    itemname : tempObj.itemname,
                    quantity : 0,
                    lot : []
                };
            }

            if(!isEmpty(tempObj.lotno)) {
                rmObjArr[tempObj.itemcode].lot.push({
                    lotno : tempObj.lotno,
                    quantity : -1*parseNumber(tempObj.quantity)
                })
            }
            

            rmObjArr[tempObj.itemcode].quantity += -1*parseNumber(tempObj.quantity);


            
            return true;
        });

        return rmObjArr;
    }

    function runQuery( sql ) {

        try {	

            var queryParams = new Array();

            var moreRows = true;	

            var rows = new Array();						

            var paginatedRowBegin = 1;

            var paginatedRowEnd = 5000;						

            do {			

                var paginatedSQL = 'SELECT * FROM ( SELECT ROWNUM AS ROWNUMBER, * FROM (' + sql + ' ) ) WHERE ( ROWNUMBER BETWEEN ' + paginatedRowBegin + ' AND ' + paginatedRowEnd + ')';

                var queryResults = query.runSuiteQL( { query: paginatedSQL, params: queryParams } ).asMappedResults(); 	
                rows = rows.concat( queryResults );	
                
                if ( queryResults.length < 5000 ) { moreRows = false; }

                paginatedRowBegin = paginatedRowBegin + 5000;
                paginatedRowEnd = paginatedRowEnd + 5000;
            
            } while ( moreRows );
                                                                
        } catch( e ) {		

            log.error( { title: 'selectAllRows - error', details: { 'sql': sql, 'queryParams': queryParams, 'error': e } } );

        }	
        
        return rows;

    }

    function parseNumber(val){
        var parsed = parseFloat(val);
        return isNaN(parsed)?0:parsed;
    }

    function isEmpty(str) {
        return (!str || 0 === str.length);
    }

    Number.prototype.round = function(p) {
        p = p || 10;
        return parseFloat( this.toFixed(p) );
    };

    function isEmptyObj(obj) {
        return Object.keys(obj).length === 0;
    }   

    function isObject(val) {
        return (typeof val === 'object');
    }   

    return {
        onRequest: onRequest
    };
});
