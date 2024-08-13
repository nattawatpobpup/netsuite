/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
 /*******************************************************************************
 * CLIENTNAME:PP
 * ADD Print Button in AR Module
 * **************************************************************************
 * Date : 30-04-2022
 *
 * Author: Surasak P.
 * Script Description : Add Print Button & Map with client script
 * 
 *
 * REVISION HISTORY
 *
 * Revision 1.0 ${30-04-2022} SP : created
 ******************************************************************************/
  define(['N/record'],function(record){

    function beforeLoad(context) {
        
        try{
            if(context.type === "view"){    
                context.form.clientScriptModulePath = "./TaxInvoice Add Button - CS.js";  
                var recRecord = record.load(
                    {
                        type: 'invoice', 
                        id: context.newRecord.id
                    }
                ); 
                var customForm = recRecord.getText('customform');    
                log.debug('customForm',customForm); 
                // if(customForm == 'Simple Invoice - Non Entity'){
                    context.form.addButton({
                        id : 'custpage_print_taxinvoice',
                        label : 'Invoice',
                        functionName: 'printTaxInvoice' 
                    });    
                // } else{
                //     context.form.addButton({
                //         id : 'custpage_print_invoice',
                //         label : 'ใบแจ้งหนี้/ใบกำกับภาษี',
                //         functionName: 'printInvoice' 
                //     });    
                // }
                                                                                                                                                                                                  
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