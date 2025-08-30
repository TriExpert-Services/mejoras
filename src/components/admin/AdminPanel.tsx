@@ .. @@
                           <div className="text-right">
                             {getStatusBadge(vm.status)}
                            {vm.status === 'suspended' && (
                              <p className="text-xs text-red-600 mt-1">
                                Suspendido por pago
                              </p>
                            )}
                           </div>
                         </div>
                         <div className="flex items-center justify-between text-sm text-gray-600">
                           <span>{vm.cpu_cores} vCPU • {vm.ram_gb}GB RAM</span>
                           <div className="flex gap-2">
                            {vm.status === 'stopped' && vm.status !== 'suspended' && (
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => handleVMAction(vm.id, 'start')}
                                 disabled={actionLoading[vm.id]}
                                 title="Iniciar VM"
                               >
                                 <Play className="h-3 w-3" />
                               </Button>
                             )}
                            {vm.status === 'running' && vm.status !== 'suspended' && (
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => handleVMAction(vm.id, 'stop')}
                                 disabled={actionLoading[vm.id]}
                                 title="Detener VM"
                               >
                                 <Square className="h-3 w-3" />
                               </Button>
                             )}
                            {vm.status === 'suspended' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled
                                title="VM suspendido por falta de pago"
                                className="text-red-500"
                              >
                                <MonitorIcon className="h-3 w-3" />
                              </Button>
                            )}
                             <Button
                               variant="ghost"
                               size="sm"