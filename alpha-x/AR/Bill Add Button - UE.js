/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
 /*******************************************************************************
 * CLIENTNAME:PP
 * ADD Print Button in Journal Module
 * **************************************************************************
 * Date : 30-04-2022
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
                context.form.clientScriptModulePath = "./Bill Add Button - CS.js";  
                var glRecord = record.load(
                    {
                        type: 'invoicegroup', 
                        id: context.newRecord.id
                    }
                ); 
                var customForm = glRecord.getText('customform');    
                log.debug('customForm',customForm); 
                    context.form.addButton({
                        id : 'custpage_print_bill',
                        label : 'ใบวางบิล',
                        functionName: 'printBill'
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