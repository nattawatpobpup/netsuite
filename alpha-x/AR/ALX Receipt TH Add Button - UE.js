/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
 /*******************************************************************************
 * CLIENTNAME:SIKARIN
 * ADD Print Button in AR Module
 * **************************************************************************
 * Date : 30-04-2021
 *
 * Author: Surasak P.
 * Script Description : Add Print Button & Map with client script
 * 
 *
 * REVISION HISTORY
 *
 * Revision 1.0 ${30-04-2021} SP : created
 ******************************************************************************/
  define(['N/record'],function(record){

    function beforeLoad(context) {
        
        try{
            if(context.type === "view"){    
                context.form.clientScriptModulePath = "./ALX Receipt TH Add Button - CS.js";  
                var recRecord = record.load(
                    {
                        type: 'customrecord_ldb_rcpt', 
                        id: context.newRecord.id
                    }
                ); 
                var customForm = recRecord.getText('customform');  
                    // context.form.addButton({
                    //     id : 'custpage_print_receipt',
                    //     label : 'ใบเสร็จรับเงิน',
                    //     functionName: 'printReceipt' 
                    // });                                                                                                                                                                                    
                    context.form.addButton({
                        id : 'custpage_print_receipt',
                        label : 'ใบเสร็จรับเงิน',
                        functionName: 'printReceiptTax' 
                    });    
            }

        }catch(err) {
            log.debug("error@beforeLoad",err);
        }
    
    }

    function isEmpty(str) {
        return (!str || 0 === str.length);
    }

    return{
        beforeLoad:beforeLoad	
    }
});