/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
 /*******************************************************************************
 * CLIENTNAME:PP
 * ADD Button in Credit Note
 * **************************************************************************
 * Date : 16-02-2022
 *
 * Author: Surasak P.
 * Script Description : Add Button & Map with client script
 * 
 *
 * REVISION HISTORY
 *
 * Revision 1.0 ${16-02-2021} SP : created
 ******************************************************************************/
define(['N/record'],function(record){

    function beforeLoad(context)
    {
        try{

            if(context.type=="view"){
                context.form.clientScriptModulePath = "./Credit Note Add Button - CS.js";

                var recRecord = record.load(
                    {
                        type: 'creditmemo', 
                        id: context.newRecord.id
                    }
                ); 
                var customForm = recRecord.getText('customform');  

                    context.form.addButton({
                        id : 'custpage_print_pl_btn',
                        label : 'Credit Note',
                        functionName: 'printCN' 
                    });       
                
                
            }

            

        }catch(err) {
            log.debug("error@beforeLoad",err);
        }
    }

    return{
        beforeLoad:beforeLoad	
    }
});