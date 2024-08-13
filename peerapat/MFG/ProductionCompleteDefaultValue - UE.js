/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/error', 'N/log', 'N/record', 'N/search', 'N/ui/serverWidget'],
    /**
 * @param{error} error
 * @param{log} log
 * @param{record} record
 * @param{search} search
 * @param{serverWidget} serverWidget
 */
    (error, log, record, search, serverWidget) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {

            log.debug("scriptContext.type", scriptContext.type);
            //if (scriptContext.type !== scriptContext.UserEventType.CREATE && scriptContext.type !== scriptContext.UserEventType.EDIT) return;

            /* var bomNameRecord = record.load({
                type: 'custrecord_pdc_bomname', 
                id: scriptContext.newRecord.id
            });  */

            var workorder = scriptContext.newRecord.getValue('custrecord_pdc_workorder');
            var bomName = scriptContext.newRecord.getValue('custrecord_pdc_bomname');
        
            var form = scriptContext.form;
    
            var fieldBomname = form.getField({
                id : 'custrecord_pdc_bomname'
            });
            
            // Add a dropdown field to the custom tab
            var bomNameRecord = form.addField({
                id: 'custpage_pdc_bomname',
                type: serverWidget.FieldType.SELECT,
                label: fieldBomname.label
            });
    
            // Add options to the dropdown
            bomNameRecord.addSelectOption({
                value: '',
                text: '',
            });

            form.insertField({
                field : bomNameRecord,
                nextfield : 'custrecord_pdc_item'
            });

            if (workorder) {
                var invDDLOption = getInventoryByWO(workorder);
                for (var i = 0; i < invDDLOption.length; i++) {
                    if (bomName) {
                        bomNameRecord.addSelectOption({
                            value: invDDLOption[i].value,
                            text: invDDLOption[i].text,
                            isSelected: true
                        });
                    } else {
                        bomNameRecord.addSelectOption({
                            value: invDDLOption[i].value,
                            text: invDDLOption[i].text,
                        });
                    }
                }
            }

            form.getField({
                id: "custrecord_pdc_bomname",
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN,
            });
        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {

        }

        const getInventoryByWO = function (woId) {
            var invNumberArr = [];
            var invNumberOption = []
            /* var searchObj = search.load({
                id: "customsearch_pp_wo_bomname"
            }); */

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

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
