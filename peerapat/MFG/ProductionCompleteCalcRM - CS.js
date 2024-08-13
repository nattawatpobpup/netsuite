/**
*@NApiVersion 2.0
*@NScriptType ClientScript
*/
define(['N/record','N/search','N/currentRecord'], 
function (record, search, currentRec) {

    function fieldChanged(context) {
        var currentRecord = context.currentRecord;    // Current opened record.
        var sublistName = context.sublistId;          // The internal ID of the sublist.
        var fieldId = context.fieldId;       // The internal ID of the field that was changed.
        var currentLine = context.line;               // Line number (first line has value = 0) of Item User is on.


        //UPDATE FOR INVOICE NO
        if(fieldId == 'custrecord_pdc_workorder'){
            var woId = currentRecord.getValue({
                fieldId: fieldId
            });

            if(!isEmpty(woId)) {
                var workorderissueSearchObj = search.create({
                    type: "workorderissue",
                    filters:
                    [
                       ["type","anyof","WOIssue"], 
                       "AND", 
                       ["createdfrom","anyof",woId], 
                       "AND", 
                       ["mainline","is","F"], 
                       "AND", 
                       ["unit","anyof","3"], 
                       "AND", 
                       ["transactionlinetype","anyof","WIP"]
                    ],
                    columns:
                    [
                       search.createColumn({
                          name: "formulatext",
                          summary: "GROUP",
                          formula: "CASE WHEN LOWER({item.custitemcustitem_pp_stock_group}) = 'wc-c01' THEN 'CODE0' ELSE 'LIQUID' END",
                          label: "ItemType"
                       }),
                       search.createColumn({
                          name: "quantity",
                          summary: "SUM",
                          label: "Quantity"
                       })
                    ]
                 });

                 var liquid = 0;
                 var code0 = 0;
                
                 workorderissueSearchObj.run().each(function (result) {
                    var itemType = result.getValue(workorderissueSearchObj.columns[0]);
                    var qty = result.getValue(workorderissueSearchObj.columns[1]);


                    if(itemType=='LIQUID') {
                        liquid += parseNumber(qty);
                    } else {
                        if(itemType=='CODE0') {
                            code0 += parseNumber(qty);
                        }
                    }
                    
                    return true;
                  });
        
                currentRecord.setValue({
                    fieldId: 'custrecord_pdc_dm_kg',
                    value : liquid
                });          
                
                currentRecord.setValue({
                    fieldId: 'custrecord_pdc_sm_kg',
                    value : code0
                });  

                currentRecord.setValue({
                    fieldId: 'custrecord_pdc_matqty_kg',
                    value : liquid+code0
                });  

            }
        }

    }

    function parseNumber(val) {
        var parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
    }

    function isEmpty(str) {
        return (!str || 0 === str.length);
     }

     function isEmptyObj(obj) {
        return Object.keys(obj).length === 0;
     }   

    return {
        fieldChanged: fieldChanged
    }
    
});