/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
 /*******************************************************************************
 * CLIENTNAME:PP
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
                context.form.clientScriptModulePath = "./Receipt CS Add Button - CS.js";  
                var recRecord = record.load(
                    {
                        type: 'cashsale', 
                        id: context.newRecord.id
                    }
                ); 
                var customForm = recRecord.getText('customform');    
                log.debug('customForm',customForm);

                    context.form.addButton({
                        id : 'custpage_print_receipt',
                        label : 'Cash Sale',
                        functionName: 'printRECTAX' 
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