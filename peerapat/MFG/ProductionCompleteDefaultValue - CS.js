/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/record', 'N/search', 'N/ui/dialog'],
/**
 * @param{currentRecord} currentRecord
 * @param{record} record
 * @param{search} search
 * @param{dialog} dialog
 */
function(currentRecord, record, search, dialog) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {
        var currentRecord = scriptContext.currentRecord;
        var formCode = currentRecord.getValue({
            fieldId: 'custrecord_pdc_form_code'
        });
        console.log(formCode);
        if (formCode != 'F2') {
            currentRecord.getField({
                fieldId: 'custpage_pdc_bomname'
            }).isDisplay = false;
        } else {
            currentRecord.getField({
                fieldId: 'custpage_pdc_bomname'
            }).isDisplay = true;
        }
    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {
        var currentRecord = scriptContext.currentRecord;
        var fieldId = scriptContext.fieldId;

        var formCode = currentRecord.getValue({
            fieldId: 'custrecord_pdc_form_code'
        });

        if (formCode == 'F2') {
            if(fieldId == 'custrecord_pdc_workorder') {
                var workorder = currentRecord.getValue({
                    fieldId: 'custrecord_pdc_workorder'
                });

                var invDDLOption = getInventoryByWO(workorder);

                var custBomNameRecord = currentRecord.getField({ fieldId: 'custpage_pdc_bomname' });
           
                custBomNameRecord.removeSelectOption({ value: null, }); // clears all options
                custBomNameRecord.insertSelectOption({
                    value: '',
                    text: '',
                });
                for (var i = 0; i < invDDLOption.length; i++) {
                    custBomNameRecord.insertSelectOption({
                        value: invDDLOption[i].value,
                        text: invDDLOption[i].text,
                    });
                }

                currentRecord.setValue({ fieldId: "custrecord_pdc_bomname", value: '' });
            }

            if (fieldId == 'custpage_pdc_bomname') {
                var customBomName = currentRecord.getValue({
                    fieldId : fieldId
                });
                if (customBomName) {
                    currentRecord.setValue({ fieldId: "custrecord_pdc_bomname", value: customBomName });
                } else {
                    currentRecord.setValue({ fieldId: "custrecord_pdc_bomname", value: '' });
                }
            }
        }
    }

    const getInventoryByWO = function (woId) {
        var invNumberArr = [];
        var invNumberOption = []
        var availableStockGroupIdArr = [];

        var wpc01Filter = ["name", "contains", "WP-C01"];
        var wpc02Filter = ["name", "contains", "WP-C02"];
        var wpc03Filter = ["name", "contains", "WP-C03"];
        var wpc04Filter = ["name", "contains", "WP-C04"];
        var wpc05Filter = ["name", "contains", "WP-C05"];
        var wpc06Filter = ["name", "contains", "WP-C06"];

        var stockGroupSearchObj = search.create({
            type: 'customrecordcustomrecord_pp_stock_group',
            filters:
            [
                ['isinactive', search.Operator.IS, 'F'], "AND", 
                [
                    wpc01Filter, "OR", 
                    wpc02Filter, "OR", 
                    wpc03Filter, "OR", 
                    wpc04Filter, "OR", 
                    wpc05Filter, "OR", 
                    wpc06Filter
                ]
            ],
            columns: ['name', 'custrecordcustrecord_description_stk'],
        });
        stockGroupSearchObj.run().each(function (result) {
            availableStockGroupIdArr.push(result.id);
            return true;
        });

        /* var searchObj = search.load({
            id: "customsearch_pp_wo_bomname"
        }); */

        var searchObj = search.create({
            type: search.Type.TRANSACTION,
            filters:
            [
                ['type', 'anyof', 'WOIssue'],
                "AND",
                ['inventorydetail.inventorynumber', 'noneof', '@NONE@']
            ],
            columns:
            [
               search.createColumn({
                  name: "createdfrom"
               }),
               search.createColumn({
                    name: "internalid",
                    join: "inventoryDetail"
               }),
               search.createColumn({
                    name: "inventorynumber",
                    join: "inventoryDetail"
               })
            ]
        });

        var filterArray = [];
        var currentFilterArray = searchObj.filterExpression;

        if (availableStockGroupIdArr.length > 0) {
            filterArray.push(["item.custitemcustitem_pp_stock_group", search.Operator.ANYOF, availableStockGroupIdArr]);
            filterArray.push('and');
        }
        if (woId) {
            filterArray.push(["createdfrom", search.Operator.ANYOF, woId]);
            filterArray.push('and');
        }
        if (filterArray.length > 0) {
            filterArray = filterArray.concat(currentFilterArray);
        } else {
            filterArray = currentFilterArray;
        }
        searchObj.filterExpression = filterArray;

        searchObj.run().each(function (result) {
            var invNumber = result.getValue(({'join': 'inventoryDetail','name': 'inventorynumber'}));
            invNumberArr.push(invNumber);
            return true;
        });

        if (invNumberArr.length > 0) {
            var invNumberSearchObj = search.create({
                type: search.Type.INVENTORY_NUMBER,
                filters:
                [
                    ['internalid', search.Operator.ANYOF, invNumberArr]
                ],
                columns: ['internalid', 'inventorynumber', 'item'],
            });
            
            invNumberSearchObj.run().each(function (result) {
                var internalId = result.getValue(({'name': 'internalid'}));
                var number = result.getValue(({'name': 'inventorynumber'}));

                invNumberOption.push({
                    value: internalId,
                    text: number
                });
                
                return true;
            });
        }

        return invNumberOption;
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged
    };
    
});
