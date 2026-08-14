import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import type { RequestBody, RequestList, RequestUpdate } from '../presentation/schemas/request.schemas';

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}
  private include = { pastaJuridica: { select: { id: true, nome: true, clientePrincipal: { select: { id: true, nome: true } } } }, processo: { select: { id: true, titulo: true, numeroCnj: true, tipo: true } } } as const;
  private dto(item: any) {
    const keys = ['valorPedidoCentavos','valorProvavelCentavos','valorPossivelCentavos','valorRemotoCentavos','valorFinalCentavos'];
    const result = { ...item, estimativaExito: item.estimativaExito?.toString() ?? null };
    for (const key of keys) result[key] = item[key]?.toString() ?? null;
    return result;
  }
  async list(officeId: string, q: RequestList) {
    const range = (min?: bigint, max?: bigint) => min !== undefined || max !== undefined ? { gte: min, lte: max } : undefined;
    const where: Prisma.PedidoWhereInput = { escritorioId: officeId, excluidoEm: null,
      descricao: q.q ? { contains: q.q, mode: 'insensitive' } : undefined, situacao: q.situacao, categoria: q.categoria,
      pastaJuridicaId: q.pastaJuridicaId, processoId: q.processoId,
      dataFinalizacao: q.dataFinalizacaoDe || q.dataFinalizacaoAte ? { gte: q.dataFinalizacaoDe ? new Date(q.dataFinalizacaoDe) : undefined, lte: q.dataFinalizacaoAte ? new Date(`${q.dataFinalizacaoAte}T23:59:59.999Z`) : undefined } : undefined,
      estimativaExito: q.estimativaMin !== undefined || q.estimativaMax !== undefined ? { gte: q.estimativaMin, lte: q.estimativaMax } : undefined,
      valorPedidoCentavos: range(q.valorPedidoMin,q.valorPedidoMax), valorProvavelCentavos: range(q.valorProvavelMin,q.valorProvavelMax),
      valorPossivelCentavos: range(q.valorPossivelMin,q.valorPossivelMax), valorRemotoCentavos: range(q.valorRemotoMin,q.valorRemotoMax), valorFinalCentavos: range(q.valorFinalMin,q.valorFinalMax),
    };
    const order: Record<string, Prisma.PedidoOrderByWithRelationInput> = { '-criadoEm': { criadoEm:'desc' }, criadoEm:{criadoEm:'asc'}, descricao:{descricao:'asc'}, '-descricao':{descricao:'desc'}, dataFinalizacao:{dataFinalizacao:'asc'}, '-dataFinalizacao':{dataFinalizacao:'desc'}, valorPedido:{valorPedidoCentavos:'asc'}, '-valorPedido':{valorPedidoCentavos:'desc'}, situacao:{situacao:'asc'} };
    const [items,total] = await this.prisma.client.$transaction([this.prisma.client.pedido.findMany({ where, include:this.include, orderBy:order[q.sort], skip:(q.page-1)*q.limit, take:q.limit }), this.prisma.client.pedido.count({where})]);
    return { items: items.map((x) => this.dto(x)), total, page:q.page, limit:q.limit };
  }
  async get(officeId:string,id:string) { const item=await this.prisma.client.pedido.findFirst({where:{id,escritorioId:officeId,excluidoEm:null},include:this.include}); if(!item) throw new NotFoundException('Pedido não encontrado.'); return this.dto(item); }
  private async validateContext(officeId:string,pastaId:string,processoId?:string|null) {
    const folder=await this.prisma.client.pastaJuridica.findFirst({where:{id:pastaId,escritorioId:officeId,excluidoEm:null},select:{id:true}}); if(!folder) throw new NotFoundException('Pasta Jurídica não encontrada.');
    if(processoId) { const link=await this.prisma.client.pastaJuridicaProcesso.findFirst({where:{pastaJuridicaId:pastaId,processoId,processo:{escritorioId:officeId,excluidoEm:null}},select:{processoId:true}}); if(!link) throw new BadRequestException('O Processo selecionado não pertence à Pasta Jurídica.'); }
  }
  private data(body:RequestBody|RequestUpdate) { const money=(v:string|null|undefined)=>v===undefined?undefined:v===null?null:BigInt(v); return { ...body, processoId:body.processoId, dataFinalizacao:body.dataFinalizacao===undefined?undefined:body.dataFinalizacao?new Date(body.dataFinalizacao):null, estimativaExito:body.estimativaExito===undefined?undefined:body.estimativaExito, valorPedidoCentavos:money(body.valorPedidoCentavos),valorProvavelCentavos:money(body.valorProvavelCentavos),valorPossivelCentavos:money(body.valorPossivelCentavos),valorRemotoCentavos:money(body.valorRemotoCentavos),valorFinalCentavos:money(body.valorFinalCentavos) }; }
  async create(officeId:string,body:RequestBody) { await this.validateContext(officeId,body.pastaJuridicaId,body.processoId); const item=await this.prisma.client.pedido.create({data:{...this.data(body),escritorioId:officeId} as Prisma.PedidoUncheckedCreateInput,include:this.include}); return this.dto(item); }
  async update(officeId:string,id:string,body:RequestUpdate) { const current=await this.get(officeId,id); await this.validateContext(officeId,current.pastaJuridica.id,body.processoId===undefined?current.processo?.id:body.processoId); const item=await this.prisma.client.pedido.update({where:{id},data:this.data(body),include:this.include}); return this.dto(item); }
  async remove(officeId:string,id:string) { await this.get(officeId,id); await this.prisma.client.pedido.update({where:{id},data:{excluidoEm:new Date()}}); }
  async options(officeId:string) { const sets=await this.prisma.client.conjuntoValores.findMany({where:{escritorioId:officeId,ativo:true,nome:{in:['Categorias de Pedido','Situações de Pedido']}},include:{itens:{where:{ativo:true},orderBy:{ordem:'asc'}}}}); const values=(name:string,fallback:string[])=>sets.find((x)=>x.nome===name)?.itens.map((x)=>({value:x.valor,label:x.valor}))??fallback.map((x)=>({value:x,label:x})); return { categorias:values('Categorias de Pedido',['Previdenciário','Indenização','Cobrança','Obrigação de fazer','Outro']),situacoes:values('Situações de Pedido',['EM_ANDAMENTO','FINALIZADO','CANCELADO'])}; }
  async export(officeId: string, q: RequestList) {
    const first = await this.list(officeId, { ...q, page: 1, limit: 100 });
    const items = [...first.items];
    for (let page = 2; page <= Math.ceil(first.total / 100); page++) items.push(...(await this.list(officeId, { ...q, page, limit: 100 })).items);
    const brl = (value: string | null) => value === null ? '' : (Number(value) / 100).toFixed(2).replace('.', ',');
    return { items: items.map((item) => ({ descricao: item.descricao, categoria: item.categoria, pasta: item.pastaJuridica.nome, cliente: item.pastaJuridica.clientePrincipal.nome, processo: item.processo?.numeroCnj ?? item.processo?.titulo ?? '', situacao: item.situacao, dataFinalizacao: item.dataFinalizacao?.toISOString().slice(0, 10) ?? '', estimativaExito: item.estimativaExito ?? '', valorPedido: brl(item.valorPedidoCentavos), valorProvavel: brl(item.valorProvavelCentavos), valorPossivel: brl(item.valorPossivelCentavos), valorRemoto: brl(item.valorRemotoCentavos), valorFinal: brl(item.valorFinalCentavos), criadoEm: item.criadoEm.toISOString(), atualizadoEm: item.atualizadoEm.toISOString() })), total: first.total };
  }
}
