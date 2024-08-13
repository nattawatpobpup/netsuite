define(['N/currentRecord','N/url'],
function(currentRecord,url){

    function printTaxInvoice(){
        try{
            var scriptUrl = url.resolveScript({
            scriptId: 'customscript_alxinv',
            deploymentId: 'customdeploy_alxinv'
        });

        window.open(scriptUrl+"&recId="+currentRecord.get().id);

        }catch(err){
            console.log(err)
        }
    }
    

    return{
        printTaxInvoice:printTaxInvoice
    }
})