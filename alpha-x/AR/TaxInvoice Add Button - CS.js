define(['N/currentRecord','N/url'],
function(currentRecord,url){

    function printTaxInvoice(){
        try{
            var scriptUrl = url.resolveScript({
            scriptId: 'customscript_taxinv',
            deploymentId: 'customdeploy_taxinv'
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