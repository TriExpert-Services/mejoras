{/* System Controls */}
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center text-orange-600">
                   <Settings className="h-5 w-5 mr-2" />
                   Controles del Sistema
                 </CardTitle>
               </CardHeader>
               <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                   <Button
                     variant="outline"
                     onClick={() => alert('Función de mantenimiento en desarrollo')}
                     className="flex items-center justify-center"
                   >
                     <Settings className="h-4 w-4 mr-2" />
                     Modo Mantenimiento
                   </Button>
                   <Button
                     variant="outline"
                     onClick={() => {
                       manualRefresh();
                     }}
                     disabled={refreshing}
                     className="flex items-center justify-center"
                   >
                     <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                     Actualizar Todo
                   </Button>
                   <Button
                     variant="outline"
                     onClick={() => alert('Función de backup en desarrollo')}
                     className="flex items-center justify-center"
                   >
                     <HardDrive className="h-4 w-4 mr-2" />
                     Backup Sistema
                   </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) throw new Error('No hay sesión');
                        
                        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scheduled-billing-check`, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                            'Content-Type': 'application/json',
                          },
                        });
                        
                        const result = await response.json();
                        alert(`Verificación de facturación completada: ${JSON.stringify(result.data, null, 2)}`);
                      } catch (error: any) {
                        alert(`Error: ${error.message}`);
                      }
                    }}
                    className="flex items-center justify-center text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Verificar Pagos
                  </Button>
                 </div>
               </CardContent>
             </Card>